export interface IEventEmitter {
  emit(event: string, data: any): Promise<void>;
}