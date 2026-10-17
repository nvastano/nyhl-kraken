export type Player = {
  id: string;
  name: string;
  isGoalie: boolean;
};

export type RawPlayerRow = {
  Id: string;
  Name: string;
  IsGoalie: string | boolean;
  CreatedAt?: string;
};

export function rowToPlayer(row: RawPlayerRow): Player {
  return {
    id: row.Id,
    name: row.Name,
    isGoalie: row.IsGoalie === true || row.IsGoalie === "true" || row.IsGoalie === "TRUE",
  };
}
