// Supabase Auth adapter: preserves existing UI contracts while removing Firebase SDK.
import { supabase } from './supabase.js';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  getIdToken(): Promise<string>;
}
function adaptUser(user: SupabaseUser | null): User | null {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    async getIdToken() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw new Error('Sesión expirada');
      return data.session.access_token;
    },
  };
}
export const auth: { currentUser: User | null } = { currentUser: null };
export function onAuthStateChanged(_auth: typeof auth, callback: (user: User | null) => void): () => void {
  let active = true;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!active) return;
    auth.currentUser = adaptUser(session?.user ?? null);
    callback(auth.currentUser);
  });
  void supabase.auth.getSession().then(({ data }) => {
    if (!active) return;
    auth.currentUser = adaptUser(data.session?.user ?? null);
    callback(auth.currentUser);
  });
  return () => { active = false; subscription.unsubscribe(); };
}
export async function login(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/admin/dashboard' } });
  if (error) throw error;
}
export async function loginWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function sendLoginLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/auth/magic-link' } });
  if (error) throw error;
}
export const actionCodeSettingsAdmin = { url: window.location.origin + '/admin/verify-link' };
export async function sendSignInLinkToEmail(_auth: typeof auth, email: string, settings: { url: string }): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: settings.url } });
  if (error) throw error;
}
export function isLoginLink(url: string): boolean {
  const u = new URL(url);
  return u.searchParams.has('code') || u.searchParams.has('token_hash') || u.hash.includes('access_token=');
}
export function isSignInWithEmailLink(_auth: typeof auth, url: string): boolean { return isLoginLink(url); }
export async function completeLogin(_email: string, link: string): Promise<void> {
  const u = new URL(link);
  const code = u.searchParams.get('code');
  const tokenHash = u.searchParams.get('token_hash');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Enlace inválido o expirado');
  }
}
export async function signInWithEmailLink(_auth: typeof auth, email: string, link: string): Promise<void> { return completeLogin(email, link); }
export async function logout(): Promise<void> { const { error } = await supabase.auth.signOut(); if (error) throw error; auth.currentUser = null; }
export async function signOut(_auth: typeof auth): Promise<void> { return logout(); }
