export interface ISubscribeToQueueCommand {
  execute(): Promise<void> | void;
}
