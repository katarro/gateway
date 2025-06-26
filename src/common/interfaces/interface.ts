export interface MessageEvent {
  data: any;
  id?: string;
  type?: string;
  retry?: number;
}
