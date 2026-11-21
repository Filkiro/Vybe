export function maskDate(value: string): string {
  let v = value.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length > 4) {
    v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
  } else if (v.length > 2) {
    v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
  }
  return v;
}

export function parseDateToDB(dateBR: string): string {
  if (!dateBR) return "";
  const parts = dateBR.split("/");
  if (parts.length !== 3) return dateBR;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function parseDateFromDB(dateDB: string): string {
  if (!dateDB) return "";
  if (dateDB.includes("T")) dateDB = dateDB.split("T")[0];
  const parts = dateDB.split("-");
  if (parts.length !== 3) return dateDB;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
