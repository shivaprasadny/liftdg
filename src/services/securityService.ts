import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { AppError, toAppError } from '@/utils/errors';

const APP_LOCK_KEY = 'liftdg.app-lock-enabled';
export async function getBiometricAvailability(): Promise<{ available: boolean; enrolled: boolean }> {
  try { return { available: await LocalAuthentication.hasHardwareAsync(), enrolled: await LocalAuthentication.isEnrolledAsync() }; }
  catch (error) { throw toAppError(error, 'Could not check device authentication.'); }
}
export async function setSecureAppLock(enabled: boolean): Promise<void> {
  try { if (enabled) await SecureStore.setItemAsync(APP_LOCK_KEY, 'true'); else await SecureStore.deleteItemAsync(APP_LOCK_KEY); }
  catch (error) { throw toAppError(error, 'Could not update app lock.'); }
}
export async function isSecureAppLockEnabled(): Promise<boolean> { try { return await SecureStore.getItemAsync(APP_LOCK_KEY) === 'true'; } catch { return false; } }
export async function authenticateApp(): Promise<void> {
  const availability = await getBiometricAvailability();
  if (!availability.available || !availability.enrolled) throw new AppError('Device authentication is not available or enrolled.');
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock LiftDG', fallbackLabel: 'Use device passcode', disableDeviceFallback: false });
  if (!result.success) throw new AppError('Authentication was not completed.');
}

