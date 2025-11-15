export type UserId = string & { readonly __brand: 'UserId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
export type TagId = string & { readonly __brand: 'TagId' };

export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createItemId(id: string): ItemId {
  return id as ItemId;
}
