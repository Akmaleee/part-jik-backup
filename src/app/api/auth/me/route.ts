import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ====================================================================
  // PERBAIKAN: Cek apakah JWT_SECRET ada di server
  // ====================================================================
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not set in environment variables.");
    return NextResponse.json(
      { error: "Internal Server Configuration Error" },
      { status: 500 }
    );
  }
  // ====================================================================

  try {
    // Setelah pengecekan di atas, TypeScript tahu 'JWT_SECRET' adalah 'string'
    const decoded = jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ success: true, user: decoded });
  } catch (error) {
    // Ini akan menangani token yang kadaluarsa atau tidak valid
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.JWT_SECRET;

// export async function GET(request: NextRequest) {
//   const token = request.cookies.get("auth-token")?.value;

//   if (!token) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     return NextResponse.json({ success: true, user: decoded });
//   } catch (error) {
//     return NextResponse.json({ error: "Invalid token" }, { status: 401 });
//   }
// }
