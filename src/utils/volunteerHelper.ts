export interface IVolunteerPayload {
  name: string;
  role?: "ADMIN" | "TEAM" | "VOLUNTEER" | "CUSTOMER";
  mobile?: string | number;
  username?: string;
  password?: string;
}

export function formatVolunteerCredentials(payload: IVolunteerPayload) {
  const role = payload.role || "VOLUNTEER";
  const nameClean = payload.name.trim();

  let username = payload.username;
  let password = payload.password;

  if (!username) {
    const formattedName = nameClean.toLowerCase().replace(/\s+/g, ".");
    const mobile = payload.mobile
      ? String(payload.mobile).trim()
      : "0000000000";
    username = `${formattedName}.${mobile}@${role.toLowerCase()}`;
  }

  if (!password) {
    password = nameClean;
  }

  return { username, password, role };
}
