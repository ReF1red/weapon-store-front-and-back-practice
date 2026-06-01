import React, { useState, useEffect } from 'react';
import { api } from '../api';

const VAPID_PUBLIC_KEY = 'BPlv95NfVupqg6SLmbUhZ10wI_Sl9vLIjESmwAEZIGgqVF8eCZA39aJjX9zEzKXqeFjDnn9vF_3Ohbmjbg58z8A';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function PushNotification() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);

                // Если backend перезапускался, он мог потерять подписки.
                // Синхронизируем текущую подписку браузера повторно.
                if (subscription) {
                    try {
                        await api.subscribe(subscription);
                    } catch (syncError) {
                        console.error('Push subscription sync failed:', syncError);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestNotificationPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    };

    const subscribeToPush = async () => {
        try {
            const hasPermission = await requestNotificationPermission();
            if (!hasPermission) {
                alert('Для получения уведомлений разрешите их в настройках браузера');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            await api.subscribe(subscription);
            setIsSubscribed(true);
        } catch (error) {
            console.error('Error subscribing to push:', error);
            alert('Не удалось включить уведомления');
        }
    };

    const unsubscribeFromPush = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                await api.unsubscribe(subscription.endpoint);
                await subscription.unsubscribe();
                setIsSubscribed(false);
            }
        } catch (error) {
            console.error('Error unsubscribing from push:', error);
            alert('Не удалось отключить уведомления');
        }
    };

    const testPush = async () => {
        try {
            setIsTesting(true);
            const result = await api.pushTest();
            const stats = result?.stats;
            if (stats) {
                alert(`Тест push: доставлено ${stats.success}/${stats.total}, ошибок ${stats.failed}`);
            } else {
                alert('Тестовый push отправлен');
            }
        } catch (error) {
            console.error('Error sending test push:', error);
            const details = error.response?.data?.stats;
            if (details) {
                alert(`Push не доставлен: ${details.success}/${details.total}. Проверь endpoint/разрешение уведомлений.`);
            } else {
                alert(error.response?.data?.error || error.response?.data?.message || 'Не удалось отправить тестовый push');
            }
        } finally {
            setIsTesting(false);
        }
    };

    if (loading) {
        return <button className="push-btn" disabled>Загрузка...</button>;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return null;
    }

    if (isSubscribed) {
        return (
            <>
                <button className="push-btn push-btn-enable" onClick={testPush} disabled={isTesting}>
                    {isTesting ? 'Отправка...' : 'Тест push'}
                </button>
                <button className="push-btn push-btn-disable" onClick={unsubscribeFromPush}>
                    Отключить уведомления
                </button>
            </>
        );
    }

    return (
        <button className="push-btn push-btn-enable" onClick={subscribeToPush}>
            Включить уведомления
        </button>
    );
}

export default PushNotification;
