// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
// Hapus import 'runtime' jika tidak digunakan
// import { runtime } from "./app/api/uploads/presign/route"; 

const JWT_SECRET = process.env.JWT_SECRET;

// ====================================================================
// PERUBAHAN 1: Daftarkan semua rute yang perlu dilindungi
// ====================================================================
// Routes yang memerlukan authentication
const protectedRoutes = [
  "/",
  "/chat",
  "/docs",
  "/company",
  "/mom",
  "/jik-module", // <-- DITAMBAHKAN
  "/nda",          // <-- DITAMBAHKAN
  "/mou",          // <-- DITAMBAHKAN
  "/msa",          // <-- DITAMBAHKAN
  "/approver",     // <-- DITAMBAHKAN
];
// ====================================================================

// Routes yang hanya bisa diakses jika belum login
const authRoutes = ["/login"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Verify token
  let isAuthenticated = false;
  let userData = null;

  if (token) {
    try {
      userData = jwt.verify(token, JWT_SECRET as string) as {
        userId: string;
        username: string;
        email: string;
        name: string;
        role: string;
      };
      isAuthenticated = true;
    } catch (error) {
      // Token invalid or expired
      isAuthenticated = false;
    }
  }

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // ====================================================================
  // PERUBAHAN 2: Hapus cookie jika token invalid saat akses protected route
  // ====================================================================
  // ✅ 1. Kalau belum login & akses protected route → redirect ke login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    
    // Buat respons redirect
    const response = NextResponse.redirect(loginUrl);

    // Jika token ada tapi tidak valid (kadaluarsa/salah), hapus cookie
    if (token) {
      response.cookies.set("auth-token", "", { maxAge: -1, path: "/" });
    }
    
    return response;
  }
  // ====================================================================


  // ✅ 2. Kalau udah login & buka halaman login → redirect ke dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Add user data to headers for server components
  const response = NextResponse.next();
  
  if (isAuthenticated && userData) {
    response.headers.set("x-user-id", userData.userId);
    response.headers.set("x-user-username", userData.username);
    response.headers.set("x-user-email", userData.email);
    response.headers.set("x-user-name", userData.name || "");
    response.headers.set("x-user-role", userData.role);
  }

  return response;
}

// Specify which routes should use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
  runtime: "nodejs", // Pastikan runtime sesuai, 'nodejs' sudah benar
};

// // src/middleware.ts
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import jwt from "jsonwebtoken";
// import { runtime } from "./app/api/uploads/presign/route";

// const JWT_SECRET = process.env.JWT_SECRET

// // Routes yang memerlukan authentication
// const protectedRoutes = ["/", "/chat", "/docs", "/company", "/mom"];

// // Routes yang hanya bisa diakses jika belum login
// const authRoutes = ["/login"];

// export function middleware(request: NextRequest) {
//   const token = request.cookies.get("auth-token")?.value;
//   const { pathname } = request.nextUrl;

//   // Check if route is protected
// //   const isProtectedRoute = protectedRoutes.some((route) =>
// //     pathname === route || pathname.startsWith(route)
// //   );

//   // Check if route is auth route (login page)
// //   const isAuthRoute = authRoutes.some((route) => pathname === route || pathname.startsWith(route));

//   // Verify token
//   let isAuthenticated = false;
//   let userData = null;

//   if (token) {
//     try {
//       userData = jwt.verify(token, JWT_SECRET) as {
//         userId: string;
//         username: string;
//         email: string;
//         name: string;
//         role: string;
//       };
//       isAuthenticated = true;
//     } catch (error) {
//       // Token invalid or expired
//       isAuthenticated = false;
//     }
//   }

//   const isProtectedRoute = protectedRoutes.some(
//     (route) => pathname === route || pathname.startsWith(route + "/")
//   );
//   const isAuthRoute = authRoutes.some(
//     (route) => pathname === route || pathname.startsWith(route + "/")
//   );

//   // ✅ 1. Kalau belum login & akses protected route → redirect ke login
//   if (isProtectedRoute && !isAuthenticated) {
//     const loginUrl = new URL("/login", request.url);
//     loginUrl.searchParams.set("redirect", pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   // ✅ 2. Kalau udah login & buka halaman login → redirect ke dashboard
//   if (isAuthRoute && isAuthenticated) {
//     return NextResponse.redirect(new URL("/", request.url));
//   }

//   // Add user data to headers for server components
//   const response = NextResponse.next();
  
//   if (isAuthenticated && userData) {
//     response.headers.set("x-user-id", userData.userId);
//     response.headers.set("x-user-username", userData.username);
//     response.headers.set("x-user-email", userData.email);
//     response.headers.set("x-user-name", userData.name || "");
//     response.headers.set("x-user-role", userData.role);
//   }

//   return response;
// }

// // Specify which routes should use this middleware
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - public files (public folder)
//      */
//     "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
//   ],
//   runtime: "nodejs",
// };