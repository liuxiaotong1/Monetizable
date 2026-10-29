declare module "web-push" {
  export interface PushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  export interface WebPushClient {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: PushSubscription, payload: string, options?: { TTL?: number }): Promise<unknown>;
  }
  const webpush: WebPushClient;
  export default webpush;
}
