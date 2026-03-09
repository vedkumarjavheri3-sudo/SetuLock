import * as ScreenCapture from 'expo-screen-capture';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Prevents screenshots on Android (FLAG_SECURE) and registers listeners to warn on iOS.
 * Best called in a useEffect hook on sensitive screens.
 */
export const enableScreenshotProtection = async () => {
    try {
        await ScreenCapture.preventScreenCaptureAsync();
        // iOS doesn't strictly prevent it like Android's FLAG_SECURE, 
        // so it's good practice to also listen for the event.
        return ScreenCapture.addScreenshotListener(() => {
            console.warn('Screenshot detected on sensitive screen. Forcing app pause/logout is recommended in Gov Apps.');
            // Logic to blur screen or alert audit system could go here.
        });
    } catch (error) {
        console.warn('Screenshot protection error:', error);
        return null;
    }
};

export const disableScreenshotProtection = async () => {
    try {
        await ScreenCapture.allowScreenCaptureAsync();
    } catch (error) {
        console.warn('Failed to re-enable screen capture:', error);
    }
};

/**
 * Basic Root / Jailbreak detection logic.
 */
export const isDeviceCompromised = () => {
    // `expo-device` provides basic info. 
    // Real root detection requires native modules like `jail-monkey`, 
    // but as a rudimentary check in JS:
    if (!Device.isDevice) {
        // Emulator/Simulator (often blocked in production Gov apps)
        return true;
    }

    // Without a bare workflow or custom dev client including native jailbreak modules,
    // we cannot 100% guarantee root detection. 
    // Placeholder for `jail-monkey` integration in a custom build:
    // return JailMonkey.isJailBroken();

    return false;
};
