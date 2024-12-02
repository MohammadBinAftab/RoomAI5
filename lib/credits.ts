import { supabase } from './supabase';

export async function getUserCredits(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching credits:', error);
    return 0;
  }

  return data?.credits || 0;
}

export async function updateUserCredits(userId: string, credits: number): Promise<boolean> {
  const { error } = await supabase
    .from('user_credits')
    .upsert({ 
      user_id: userId, 
      credits: credits 
    });

  if (error) {
    console.error('Error updating credits:', error);
    return false;
  }

  return true;
}

export async function deductCredits(userId: string, amount: number = 1): Promise<boolean> {
  const currentCredits = await getUserCredits(userId);
  
  if (currentCredits < amount) {
    return false;
  }

  return updateUserCredits(userId, currentCredits - amount);
}

export async function addCredits(userId: string, amount: number): Promise<boolean> {
  const currentCredits = await getUserCredits(userId);
  return updateUserCredits(userId, currentCredits + amount);
}