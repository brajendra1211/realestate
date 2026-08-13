import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "SUBADMIN" | "OWNER" | "DEALER" | "BUYER" | "AGENT" | "INVESTOR";
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SUBADMIN" | "OWNER" | "DEALER" | "BUYER" | "AGENT" | "INVESTOR";
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SUBADMIN" | "OWNER" | "DEALER" | "BUYER" | "AGENT" | "INVESTOR";
  }
}
