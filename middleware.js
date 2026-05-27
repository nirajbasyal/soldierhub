import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/") {
    const postId = searchParams.get("post");

    if (postId) {
      const url = request.nextUrl.clone();
      url.pathname = `/post/${encodeURIComponent(postId)}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
