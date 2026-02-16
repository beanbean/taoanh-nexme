import { createClient } from '@supabase/supabase-js';
import type { MarathonDataset, Player } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth functions
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export function isAdmin(email?: string | null): boolean {
  return email === 'dqcong@gmail.com';
}

export async function checkApprovalStatus(userId: string): Promise<{ status: string | null; needsRequest: boolean }> {
  const { data, error } = await supabase
    .from('user_approvals')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { status: null, needsRequest: true };
  }

  return { status: data.status, needsRequest: false };
}

export async function requestApproval(user: { id: string; email?: string | null; user_metadata?: any }): Promise<boolean> {
  const { error } = await supabase
    .from('user_approvals')
    .insert([{
      user_id: user.id,
      email: user.email || '',
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      status: 'pending',
    }]);

  if (error) {
    console.error('Error creating approval request:', error);
    return false;
  }
  return true;
}

export async function getAllPendingApprovals(): Promise<any[]> {
  const { data, error } = await supabase
    .from('user_approvals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending approvals:', error);
    return [];
  }

  return data || [];
}

export async function getAllApprovals(): Promise<any[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('getAllApprovals: No active session');
    return [];
  }

  const { data, error } = await supabase
    .from('user_approvals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all approvals:', error.message, error.code, error.details);
    return [];
  }

  return data || [];
}

export async function approveUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_approvals')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('Error approving user:', error);
    return false;
  }
  return true;
}

export async function rejectUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_approvals')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('Error rejecting user:', error);
    return false;
  }
  return true;
}

// Dataset functions
export async function getDataset(userId: string, datasetId?: string): Promise<MarathonDataset | null> {
  const query = supabase
    .from('marathon_datasets')
    .select('*')
    .eq('user_id', userId);

  if (datasetId) {
    const { data, error } = await query.eq('id', datasetId).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching dataset:', error);
      return null;
    }
    return data;
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching dataset:', error);
    return null;
  }

  return data;
}

export async function getAllDatasets(userId: string): Promise<MarathonDataset[]> {
  const { data, error } = await supabase
    .from('marathon_datasets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching datasets:', error);
    return [];
  }

  return data || [];
}

export async function upsertDataset(dataset: MarathonDataset, userId: string): Promise<string | null> {
  const datasetToSave = {
    ...dataset,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (dataset.id) {
    const { error } = await supabase
      .from('marathon_datasets')
      .update(datasetToSave)
      .eq('id', dataset.id);

    if (error) {
      console.error('Error updating dataset:', error);
      return null;
    }
    return dataset.id;
  } else {
    const { data, error } = await supabase
      .from('marathon_datasets')
      .insert([datasetToSave])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating dataset:', error);
      return null;
    }
    return data?.id || null;
  }
}

export async function clearAllData(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('marathon_datasets')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing data:', error);
    return false;
  }
  return true;
}

// Player functions
export async function getPlayers(datasetId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('marathon_players')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  return data || [];
}

export async function upsertPlayer(player: Player, datasetId: string): Promise<string | null> {
  const playerToSave = {
    ...player,
    dataset_id: datasetId,
    updated_at: new Date().toISOString(),
  };

  if (player.id) {
    const { error } = await supabase
      .from('marathon_players')
      .update(playerToSave)
      .eq('id', player.id);

    if (error) {
      console.error('Error updating player:', error);
      return null;
    }
    return player.id;
  } else {
    const { data, error } = await supabase
      .from('marathon_players')
      .insert([playerToSave])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating player:', error);
      return null;
    }
    return data?.id || null;
  }
}

export async function deletePlayer(playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('marathon_players')
    .delete()
    .eq('id', playerId);

  if (error) {
    console.error('Error deleting player:', error);
    return false;
  }
  return true;
}

// Avatar upload function
export async function uploadAvatar(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('marathon-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('marathon-avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadAvatar:', error);
    return null;
  }
}
