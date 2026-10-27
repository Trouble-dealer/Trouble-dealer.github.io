import { createSyncHandler } from './handler.mjs';
declare const Deno: { env: { get(name:string):string|undefined }; serve(handler:(request:Request)=>Promise<Response>):void };
// Public API key authenticates callers; the privileged action is restricted to
// registering IDs independently fetched from this site's public publication index.
// A caller cannot submit IDs, URLs, settings, SQL or moderation changes.
Deno.serve(createSyncHandler({
  publicKey:'sb_publishable_NfqpPFO5Zw35kABLetzrcg_e8oYQhk-',
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  apiUrl:Deno.env.get('SUPABASE_URL'),
}));
