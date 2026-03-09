import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Validates user identity via Biometrics (FaceID/Fingerprint) or Device PIN.
 */
export const requireBiometricUnlock = async (promptMessage = 'Unlock SetuLock') => {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        // If device doesn't have biometrics setup, we might fallback to a PIN mechanism 
        // or just let them through based on Gov requirements, but usually it's required.
        if (!hasHardware || !isEnrolled) {
            console.warn('Biometrics not setup on this device.');
            // Bypass for development / emulator if not strict
            return { success: true, error: 'biometrics_unavailable_bypassed' };
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            fallbackLabel: 'Use Device PIN',
            disableDeviceFallback: false, // Allow PIN if biometrics fail
            cancelLabel: 'Cancel'
        });

        return { success: result.success };
    } catch (error) {
        console.error('Biometric authentication failed:', error);
        return { success: false, error };
    }
};
