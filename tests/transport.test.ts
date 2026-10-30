import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createGraphqlTransport } from '../src/services/graphqlTransport.ts';

function harness(fetcher: typeof fetch, timeoutMs = 1000) {
  let token: string | null = 'session', version = 0, expired = 0, saved = 0;
  const request = createGraphqlTransport({ url:'https://api.example.test/graphql',fetcher,timeoutMs,getSessionVersion:()=>version,
    getToken:async()=>token,saveToken:async value=>{token=value;saved++;},onExpired:async()=>{expired++;token=null;version++;} });
  return {request,getToken:()=>token,stats:()=>({expired,saved}),switchSession:()=>{version++;token='new-session';},removeToken:()=>{token=null;}};
}
const response = (body: unknown, status=200) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
test('uses the documented raw authorization header and rotates response tokens',async()=>{
  let captured: RequestInit | undefined;
  const h=harness((async(_url,init)=>{captured=init;return response({data:{accounts:[],token:'rotated'}});}) as typeof fetch);
  const result=await h.request<{accounts:unknown[]}>('query OrgList {}',{});
  assert.deepEqual(result.accounts,[]); assert.equal((captured?.headers as Record<string,string>).authorization,'session');
  assert.equal(h.getToken(),'rotated'); assert.deepEqual(h.stats(),{expired:0,saved:1});
});
test('sign-in requests omit authorization and do not persist arbitrary top-level tokens',async()=>{
  let headers: HeadersInit | undefined;
  const h=harness((async(_url,init)=>{headers=init?.headers;return response({data:{signIn:null,token:'ignore'}});}) as typeof fetch);
  await h.request('query SignIn {}',{},undefined,false);
  assert.equal((headers as Record<string,string>).authorization,undefined); assert.equal(h.stats().saved,0);
});
test('HTTP 401 and GraphQL authentication failures expire the session',async()=>{
  for (const fetcher of [
    (async()=>response({},401)) as typeof fetch,
    (async()=>response({errors:[{message:'jwt expired',extensions:{code:'UNAUTHENTICATED'}}]})) as typeof fetch,
  ]) {
    const h=harness(fetcher); await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='auth');
    assert.equal(h.stats().expired,1); assert.equal(h.getToken(),null);
  }
});
test('permission and invalid JSON responses give actionable errors',async()=>{
  let h=harness((async()=>response({},403)) as typeof fetch);
  await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='permission');
  h=harness((async()=>new Response('not json',{status:200})) as typeof fetch);
  await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='server');
  h=harness((async()=>response(null)) as typeof fetch);
  await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='server');
  h=harness((async()=>response({errors:[{message:'Denied',extensions:{code:'FORBIDDEN'}}]})) as typeof fetch);
  await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='permission');
});
test('missing tokens never send authenticated requests',async()=>{
  let called=false;
  const h=harness((async()=>{called=true;return response({data:{}});}) as typeof fetch); h.removeToken();
  await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='auth'); assert.equal(called,false);
});
test('late responses cannot rotate tokens into a different signed-in session',async()=>{
  let finish!: (response: Response)=>void;
  let started!: ()=>void; const ready=new Promise<void>(resolve=>{started=resolve;});
  const h=harness((async()=>{started();return new Promise<Response>(resolve=>{finish=resolve;});}) as typeof fetch);
  const pending=h.request('query {}'); await ready; h.switchSession();
  finish(response({data:{token:'old-rotated',accounts:[]}}));
  await assert.rejects(pending,error=>error instanceof Error&&error.name==='AbortError');
  assert.equal(h.getToken(),'new-session'); assert.deepEqual(h.stats(),{expired:0,saved:0});
});
test('cancellation stays distinct from request timeout',async()=>{
  const fetcher=(async(_url:unknown,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
    const fail=()=>{const error=new Error('aborted');error.name='AbortError';reject(error);};
    if(init?.signal?.aborted)fail();else init?.signal?.addEventListener('abort',fail,{once:true});
  })) as typeof fetch;
  const h=harness(fetcher,10);
  await assert.rejects(h.request('query {}'),error=>error instanceof ApiError&&error.code==='timeout');
  const controller=new AbortController(); controller.abort();
  await assert.rejects(h.request('query {}',{},controller.signal),error=>error instanceof Error&&error.name==='AbortError');
});
