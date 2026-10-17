export type Player = {
  id: string;
  name: string;
  number: string;
  isGoalie: boolean;
};

export type RawPlayerRow = {
  Id: string;
  Name: string;
  Number?: string | number;
  IsGoalie: string | boolean;
  CreatedAt?: string;
};

export function rowToPlayer(row: RawPlayerRow): Player {
  return {
    id: row.Id,
    name: row.Name,
    number: row.Number !== undefined && row.Number !== "" ? String(row.Number) : "",
    isGoalie: row.IsGoalie === true || row.IsGoalie === "true" || row.IsGoalie === "TRUE",
  };
}

export function playerLabel(p: { name: string; number?: string }): string {
  return p.number ? `#${p.number} ${p.name}` : p.name;
}
