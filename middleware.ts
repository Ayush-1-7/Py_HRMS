import { NextRequest, NextResponse } from "next/server";

// 1. Specify protected and public routes
const protectedRoutes = ["/dashboard", "/attendance", "/payroll", "/reports", "/settings", "/personnel"];
const publicRoutes = ["/login"];

export default async function middleware(req: NextRequest) {
    return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
