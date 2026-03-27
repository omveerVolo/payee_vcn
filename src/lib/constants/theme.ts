import {
  Home,
  CreditCard,
  FileText,
  Grid,
  Settings,
  User,
  LogOut,
} from "lucide-svelte";

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  id?: string;
  isAdminOnly?: boolean;
  isPayerOnly?: boolean;
  isPayeeOnly?: boolean;
  children?: { label: string; path: string; adminOnly?: boolean }[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  sidebarBg: string;
  sidebarBorder: string;
  navActiveBg: string;
  navActiveBorder: string;
  navHoverBg: string;
  navHoverBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  statusSuccessBg: string;
  statusSuccessText: string;
  statusSuccessBorder: string;
  statusPendingBg: string;
  statusPendingText: string;
  statusPendingBorder: string;
  cardBg: string;
  cardBorder: string;
  cardTitle: string;
  cardValue: string;
  cardBgHighlighted: string;
  cardBorderHighlighted: string;
}

export interface RoleTheme {
  name: string;
  colors: ThemeColors;
  navigation: {
    main: NavItem[];
    bottom: NavItem[];
  };
}

const commonBottomNav: NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    path: "#",
    icon: Settings,
    children: [
      { label: "Workflow", path: "/settings/workflow" },
      { label: "Users and roles", path: "/settings/users" },
    ],
  },
  {
    id: "account",
    label: "Account",
    path: "/account",
    icon: User,
  },
  {
    id: "logout",
    label: "Logout",
    path: "/logout",
    icon: LogOut,
  },
];

const defaultColors: ThemeColors = {
  primary: "#52409b", // Purple-blue for payer
  secondary: "#00a886", // Teal for contrast
  sidebarBg: "#0010D7", // Branded blue for all roles
  sidebarBorder: "#000da8",
  navActiveBg: "#000da8",
  navActiveBorder: "#ffffff", 
  navHoverBg: "rgba(0, 13, 168, 0.4)",
  navHoverBorder: "rgba(255, 255, 255, 0.3)",
  textPrimary: "#ffffff",
  textSecondary: "#94a3b8",
  accent: "#ea540e",
  statusSuccessBg: "#e8f8f5",
  statusSuccessText: "#1a7f71",
  statusSuccessBorder: "#8cdccb",
  statusPendingBg: "rgba(234, 84, 14, 0.1)",
  statusPendingText: "#ea540e",
  statusPendingBorder: "rgba(234, 84, 14, 0.2)",
  cardBg: "#ffffff",
  cardBorder: "#52409b",
  cardTitle: "#64748b",
  cardValue: "#52409b",
  cardBgHighlighted: "rgba(82, 64, 155, 0.05)",
  cardBorderHighlighted: "#52409b",
};

export const THEMES: Record<string, RoleTheme> = {
  admin: {
    name: "Admin",
    colors: {
      ...defaultColors,
    },
    navigation: {
      main: [
        { label: "Home", path: "/", icon: Home },
        {
          label: "Payouts",
          path: "/payouts",
          icon: CreditCard,
          children: [
            { label: "Approve Payouts", path: "/payouts/approvals" },
            { label: "Redeemed Cards", path: "/payouts/redeemed" },
            { label: "Settled Payouts", path: "/payouts/settled" },
          ],
        },
        // Admin usually has "Programs" and "Reports" disabled in current Nav, but we can control it here
        { label: "Reports", path: "/reports", icon: FileText, isAdminOnly: false }, // Currently disabled in UI for admin
        { label: "Programs", path: "/programs", icon: Grid, isAdminOnly: false }, // Currently disabled in UI for admin
      ],
      bottom: commonBottomNav,
    },
  },
  payer: {
    name: "Payer",
    colors: {
      ...defaultColors,
      sidebarBg: "#1b0a5e", // Payer purple
      sidebarBorder: "#443482",
      navActiveBg: "#2e1980",
      navActiveBorder: "#ffffff",
      navHoverBg: "rgba(68, 52, 130, 0.4)",
      navHoverBorder: "rgba(255, 255, 255, 0.3)",
    },
    navigation: {
      main: [
        { label: "Home", path: "/", icon: Home },
        { label: "Payouts", path: "/create-payout", icon: CreditCard }, // Payer goes directly to create
        { label: "Reports", path: "/reports", icon: FileText },
        { label: "Programs", path: "/programs", icon: Grid },
      ],
      bottom: commonBottomNav,
    },
  },
  payee: {
    name: "Payee",
    colors: {
      ...defaultColors,
      primary: "#7d326f", // Maroon for payee
      sidebarBg: "#190c21", // Very deep, premium charcoal with a hint of purple
      sidebarBorder: "#1a131f",
      navActiveBg: "#1a131f",
      navActiveBorder: "#ffffff", // High-contrast white border
      navHoverBg: "rgba(26, 19, 31, 0.4)",
      navHoverBorder: "rgba(255, 255, 255, 0.2)",
      secondary: "#0066cc",
      cardBorder: "#7d326f",
      cardValue: "#7d326f",
      cardBgHighlighted: "rgba(125, 50, 111, 0.05)",
      cardBorderHighlighted: "#7d326f",
    },
    navigation: {
      main: [
        { label: "Home", path: "/", icon: Home },
        {
          label: "Payouts",
          path: "/payouts",
          icon: CreditCard,
          children: [
            { label: "New Payout", path: "/payouts/new" },
            { label: "Redeemed Cards", path: "/payouts/redeemed" },
            { label: "Settled Payouts", path: "/payouts/settled" },
            { label: "Approve payouts", path: "/payouts/approvals" },
          ],
        },
        { label: "Reports", path: "/reports", icon: FileText },
        { label: "Programs", path: "/programs", icon: Grid },
      ],
      bottom: commonBottomNav,
    },
  },
};

export function getThemeByRole(role: string | undefined): RoleTheme {
  const normalizedRole = role?.toLowerCase() || "payee";
  return THEMES[normalizedRole] || THEMES.payee;
}
