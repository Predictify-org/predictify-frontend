export type UserProfile = {
  name: string;
  role: string;
  avatarUrl: string;
};

export type NavbarState = {
  notificationCount: number;
  networkName: string;
};

export const mockUser: UserProfile = {
  name: "Azunyan U. Wu",
  role: "Basic Member",
  avatarUrl: "/images/avatar2.png",
};

export const mockNavbarState: NavbarState = {
  notificationCount: 10,
  networkName: "Stellar",
};


