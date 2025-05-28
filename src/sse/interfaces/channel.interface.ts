export interface IChannelManager {
  subscribeToChannel(channel: string): Promise<void>;
  unsubscribeFromChannel(channel: string): Promise<void>;
  unsubscribeFromAll(): Promise<void>;
  isSubscribed(channel: string): boolean;
  getSubscribedChannels(): string[];
  getSubscriptionCount(): number;
}
