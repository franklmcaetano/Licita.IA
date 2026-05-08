import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ["/painel/:path*", "/api/analise/:path*", "/api/historico/:path*"],
};
