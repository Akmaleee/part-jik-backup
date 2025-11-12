"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { GoSidebarCollapse } from "react-icons/go";
import { RxDashboard } from "react-icons/rx";
import { GoPlus, GoFile } from "react-icons/go";
import { LogoutButton } from "@/components/auth/logout-button";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { MdDocumentScanner } from "react-icons/md"
import { TiDocumentText } from "react-icons/ti";
import { CiMemoPad } from "react-icons/ci";
import { TfiReceipt } from "react-icons/tfi";
import { BsFillPersonCheckFill } from "react-icons/bs";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
};

const exceptionRoutes = ["/chat", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const isException = exceptionRoutes.some(route => pathname.startsWith(route));
  
  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const navItems: NavItem[] = useMemo(
    () => [
      {
        label: "Dashboard",
        href: "/",
        icon: <RxDashboard size={18} />,
      },
      {
        label: "Company",
        href: "/company",
        icon: <HiOutlineBuildingOffice2 size={18} />,
      },
      {
        label: "MOM",
        href: "/mom",
        icon: <TiDocumentText size={18} />,
        children: [
          { label: "List MOM", href: "/mom/list-mom" },
          { label: "Create MOM", href: "/mom/create" },
          { label: "Draft", href: "/nda/draft" },
        ],
      },
      {
        label: "NDA",
        href: "/nda",
        icon: <TiDocumentText size={18} />,
      },
      {
        label: "JIK Module",
        href: "/jik-module",
        icon: <MdDocumentScanner size={18} />,
        children: [
          { label: "List JIK", href: "/jik-module/list-jik" },
          { label: "Create", href: "/jik-module/create" },
          { label: "Draft", href: "/jik-module/draft" },
        ],
      },
      {
        label: "MOU",
        href: "/mou",
        icon: <CiMemoPad size={18} />,
      },
      {
        label: "MSA",
        href: "/msa",
        icon: <TfiReceipt size={18} />,
      },
      {
        label: "Approver",
        href: "/approver",
        icon: <BsFillPersonCheckFill size={18} />,
      },
    ],
    []
  );

  if (isException) {
    // ❗ Tetap render children, tapi tanpa shell
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    // Case khusus: root ("/") hanya aktif kalau bener-bener root
    if (href === "/") return pathname === "/";

    // Case khusus: jik-module dianggap aktif di /jik-module atau child-nya
    if (href === "/jik-module") return pathname === "/jik-module" || pathname.startsWith("/jik-module/");

    // Default: match hanya kalau path mulai dengan href + "/"
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarWidth = isOpen ? "w-64" : "w-[72px]";

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
      }
    });
  }, [pathname, navItems]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col">
      {/* Topbar */}
      <div className="w-full bg-white shadow z-20 sticky top-0 p-4 flex items-center">
        <div className="flex items-center w-fit gap-3">
          {/* Toggle sidebar */}
          <button
            type="button"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen(v => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <GoSidebarCollapse
              size={22}
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          <Link
            href="/"
            prefetch
            className="inline-flex items-center rounded-lg px-2 py-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 whitespace-nowrap"
          >
            Main Menu
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-center w-full pr-[72px]">
          Dashboard Partnership
        </h1>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 bg-gray-50">
        {/* Sidebar (desktop) */}
        <aside
          className={`h-full ${sidebarWidth} bg-white border-r shadow-sm transition-all duration-200 ease-in-out hidden md:flex flex-col`}
        >
          <div className="p-3"></div>
          <nav className="px-2 space-y-1">
            {/* {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  isActive(item.href)
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
                title={!isOpen ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                <span
                  className={[
                    "whitespace-nowrap overflow-hidden transition-all",
                    isOpen ? "opacity-100" : "opacity-0 w-0",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            ))} */}
            
          </nav>
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isMenuOpen = openMenus[item.label];
            const active = isActive(item.href);

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={[
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition text-left",
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {isOpen && (
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                    )}
                    {isOpen && (
                      <span
                        className={`transition-transform ${
                          isMenuOpen ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▸
                      </span>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {isOpen && (
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                    )}
                  </Link>
                )}

                {/* Submenu */}
                {hasChildren && (
                  <div
                    className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                      isMenuOpen && isOpen ? "max-h-40" : "max-h-0"
                    }`}
                  >
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={[
                          "block rounded-lg px-3 py-2 text-sm transition",
                          isActive(sub.href)
                            ? "bg-gray-800 text-white"
                            : "text-gray-600 hover:bg-gray-100",
                        ].join(" ")}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-auto p-3 text-[11px] text-gray-400">
            <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>
              <LogoutButton />
            </div>
            <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>v1.0</div>
          </div>
        </aside>

        {/* Overlay mobile */}
        {isOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-10"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Sidebar mobile (tetap di kiri, dengan submenu support) */}
        <aside
          className={[
            "fixed md:hidden top-[64px] bottom-0 left-0 z-20 bg-white border-r shadow-lg w-64 transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <nav className="px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const isMenuOpen = openMenus[item.label];
              const active = isActive(item.href);

              return (
                <div key={item.href}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={[
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition text-left",
                        active
                          ? "bg-gray-900 text-white"
                          : "text-gray-700 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span
                        className={`transition-transform ${
                          isMenuOpen ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▸
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={[
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                        active
                          ? "bg-gray-900 text-white"
                          : "text-gray-700 hover:bg-gray-100",
                      ].join(" ")}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )}

                  {/* Submenu */}
                  {hasChildren && (
                    <div
                      className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                        isMenuOpen ? "max-h-40" : "max-h-0"
                      }`}
                    >
                      {item.children.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={[
                            "block rounded-lg px-3 py-2 text-sm transition",
                            isActive(sub.href)
                              ? "bg-gray-800 text-white"
                              : "text-gray-600 hover:bg-gray-100",
                          ].join(" ")}
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useState, useMemo, useEffect } from "react";
// import { GoSidebarCollapse } from "react-icons/go";
// import { RxDashboard } from "react-icons/rx";
// import { GoPlus, GoFile } from "react-icons/go";
// import { LogoutButton } from "@/components/auth/logout-button";
// import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
// import { MdDocumentScanner } from "react-icons/md"
// import { TiDocumentText } from "react-icons/ti";
// import { CiMemoPad } from "react-icons/ci";
// import { TfiReceipt } from "react-icons/tfi";

// type NavItem = {
//   label: string;
//   href: string;
//   icon?: React.ReactNode;
//   children?: NavItem[];
// };

// const exceptionRoutes = ["/chat", "/login"];

// export default function AppShell({ children }: { children: React.ReactNode }) {
//   const [isOpen, setIsOpen] = useState(true);
//   const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
//   const pathname = usePathname();
//   const isException = exceptionRoutes.some(route => pathname.startsWith(route));
  
//   const toggleMenu = (label: string) => {
//     setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
//   };

//   const navItems: NavItem[] = useMemo(
//     () => [
//       {
//         label: "Dashboard",
//         href: "/",
//         icon: <RxDashboard size={18} />,
//       },
//       {
//         label: "Company",
//         href: "/company",
//         icon: <HiOutlineBuildingOffice2 size={18} />,
//       },
//       {
//         label: "MOM",
//         href: "/mom",
//         icon: <TiDocumentText size={18} />,
//         children: [
//           { label: "List MOM", href: "/mom/list-mom" },
//           { label: "Create MOM", href: "/mom/create" },
//           { label: "Draft", href: "/nda/draft" },
//         ],
//       },
//       {
//         label: "NDA",
//         href: "/nda",
//         icon: <TiDocumentText size={18} />,
//       },
//       {
//         label: "JIK Module",
//         href: "/jik-module",
//         icon: <MdDocumentScanner size={18} />,
//         children: [
//           { label: "List JIK", href: "/jik-module/list-jik" },
//           { label: "Create", href: "/jik-module/create" },
//           { label: "Draft", href: "/jik-module/draft" },
//         ],
//       },
//       {
//         label: "MOU",
//         href: "/mou",
//         icon: <CiMemoPad size={18} />,
//       },
//       {
//         label: "MSA",
//         href: "/msa",
//         icon: <TfiReceipt size={18} />,
//       },
//     ],
//     []
//   );

//   if (isException) {
//     // ❗ Tetap render children, tapi tanpa shell
//     return <>{children}</>;
//   }

//   const isActive = (href: string) => {
//     // Case khusus: root ("/") hanya aktif kalau bener-bener root
//     if (href === "/") return pathname === "/";

//     // Case khusus: jik-module dianggap aktif di /jik-module atau child-nya
//     if (href === "/jik-module") return pathname === "/jik-module" || pathname.startsWith("/jik-module/");

//     // Default: match hanya kalau path mulai dengan href + "/"
//     return pathname === href || pathname.startsWith(href + "/");
//   };

//   const sidebarWidth = isOpen ? "w-64" : "w-[72px]";

//   useEffect(() => {
//     navItems.forEach((item) => {
//       if (item.children?.some((child) => pathname.startsWith(child.href))) {
//         setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
//       }
//     });
//   }, [pathname, navItems]);

//   return (
//     <div className="w-screen h-screen overflow-hidden flex flex-col">
//       {/* Topbar */}
//       <div className="w-full bg-white shadow z-20 sticky top-0 p-4 flex items-center">
//         <div className="flex items-center w-fit gap-3">
//           {/* Toggle sidebar */}
//           <button
//             type="button"
//             aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
//             aria-expanded={isOpen}
//             onClick={() => setIsOpen(v => !v)}
//             className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
//           >
//             <GoSidebarCollapse
//               size={22}
//               className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
//             />
//           </button>

//           <Link
//             href="/"
//             prefetch
//             className="inline-flex items-center rounded-lg px-2 py-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 whitespace-nowrap"
//           >
//             Main Menu
//           </Link>
//         </div>

//         <h1 className="text-2xl font-bold text-center w-full pr-[72px]">
//           Dashboard Partnership
//         </h1>
//       </div>

//       {/* Body */}
//       <div className="flex flex-1 min-h-0 bg-gray-50">
//         {/* Sidebar (desktop) */}
//         <aside
//           className={`h-full ${sidebarWidth} bg-white border-r shadow-sm transition-all duration-200 ease-in-out hidden md:flex flex-col`}
//         >
//           <div className="p-3"></div>
//           <nav className="px-2 space-y-1">
//             {/* {navItems.map((item) => (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={[
//                   "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                   isActive(item.href)
//                     ? "bg-gray-900 text-white"
//                     : "text-gray-700 hover:bg-gray-100",
//                 ].join(" ")}
//                 title={!isOpen ? item.label : undefined}
//               >
//                 <span className="shrink-0">{item.icon}</span>
//                 <span
//                   className={[
//                     "whitespace-nowrap overflow-hidden transition-all",
//                     isOpen ? "opacity-100" : "opacity-0 w-0",
//                   ].join(" ")}
//                 >
//                   {item.label}
//                 </span>
//               </Link>
//             ))} */}
            
//           </nav>
//           {navItems.map((item) => {
//             const hasChildren = !!item.children?.length;
//             const isMenuOpen = openMenus[item.label];
//             const active = isActive(item.href);

//             return (
//               <div key={item.href}>
//                 {hasChildren ? (
//                   <button
//                     onClick={() => toggleMenu(item.label)}
//                     className={[
//                       "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition text-left",
//                       active
//                         ? "bg-gray-900 text-white"
//                         : "text-gray-700 hover:bg-gray-100",
//                     ].join(" ")}
//                   >
//                     <span className="shrink-0">{item.icon}</span>
//                     {isOpen && (
//                       <span className="flex-1 whitespace-nowrap">{item.label}</span>
//                     )}
//                     {isOpen && (
//                       <span
//                         className={`transition-transform ${
//                           isMenuOpen ? "rotate-90" : "rotate-0"
//                         }`}
//                       >
//                         ▸
//                       </span>
//                     )}
//                   </button>
//                 ) : (
//                   <Link
//                     href={item.href}
//                     className={[
//                       "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                       active
//                         ? "bg-gray-900 text-white"
//                         : "text-gray-700 hover:bg-gray-100",
//                     ].join(" ")}
//                   >
//                     <span className="shrink-0">{item.icon}</span>
//                     {isOpen && (
//                       <span className="flex-1 whitespace-nowrap">{item.label}</span>
//                     )}
//                   </Link>
//                 )}

//                 {/* Submenu */}
//                 {hasChildren && (
//                   <div
//                     className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
//                       isMenuOpen && isOpen ? "max-h-40" : "max-h-0"
//                     }`}
//                   >
//                     {item.children.map((sub) => (
//                       <Link
//                         key={sub.href}
//                         href={sub.href}
//                         className={[
//                           "block rounded-lg px-3 py-2 text-sm transition",
//                           isActive(sub.href)
//                             ? "bg-gray-800 text-white"
//                             : "text-gray-600 hover:bg-gray-100",
//                         ].join(" ")}
//                       >
//                         {sub.label}
//                       </Link>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             );
//           })}

//           <div className="mt-auto p-3 text-[11px] text-gray-400">
//             <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>
//               <LogoutButton />
//             </div>
//             <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>v1.0</div>
//           </div>
//         </aside>

//         {/* Overlay mobile */}
//         {isOpen && (
//           <div
//             className="md:hidden fixed inset-0 bg-black/30 z-10"
//             onClick={() => setIsOpen(false)}
//           />
//         )}

//         {/* Sidebar mobile (tetap di kiri, dengan submenu support) */}
//         <aside
//           className={[
//             "fixed md:hidden top-[64px] bottom-0 left-0 z-20 bg-white border-r shadow-lg w-64 transition-transform duration-300 ease-in-out",
//             isOpen ? "translate-x-0" : "-translate-x-full",
//           ].join(" ")}
//         >
//           <nav className="px-2 py-4 space-y-1 overflow-y-auto">
//             {navItems.map((item) => {
//               const hasChildren = !!item.children?.length;
//               const isMenuOpen = openMenus[item.label];
//               const active = isActive(item.href);

//               return (
//                 <div key={item.href}>
//                   {hasChildren ? (
//                     <button
//                       onClick={() => toggleMenu(item.label)}
//                       className={[
//                         "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition text-left",
//                         active
//                           ? "bg-gray-900 text-white"
//                           : "text-gray-700 hover:bg-gray-100",
//                       ].join(" ")}
//                     >
//                       <div className="flex items-center gap-3">
//                         <span className="shrink-0">{item.icon}</span>
//                         <span>{item.label}</span>
//                       </div>
//                       <span
//                         className={`transition-transform ${
//                           isMenuOpen ? "rotate-90" : "rotate-0"
//                         }`}
//                       >
//                         ▸
//                       </span>
//                     </button>
//                   ) : (
//                     <Link
//                       href={item.href}
//                       className={[
//                         "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                         active
//                           ? "bg-gray-900 text-white"
//                           : "text-gray-700 hover:bg-gray-100",
//                       ].join(" ")}
//                       onClick={() => setIsOpen(false)}
//                     >
//                       <span className="shrink-0">{item.icon}</span>
//                       <span>{item.label}</span>
//                     </Link>
//                   )}

//                   {/* Submenu */}
//                   {hasChildren && (
//                     <div
//                       className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
//                         isMenuOpen ? "max-h-40" : "max-h-0"
//                       }`}
//                     >
//                       {item.children.map((sub) => (
//                         <Link
//                           key={sub.href}
//                           href={sub.href}
//                           className={[
//                             "block rounded-lg px-3 py-2 text-sm transition",
//                             isActive(sub.href)
//                               ? "bg-gray-800 text-white"
//                               : "text-gray-600 hover:bg-gray-100",
//                           ].join(" ")}
//                           onClick={() => setIsOpen(false)}
//                         >
//                           {sub.label}
//                         </Link>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </nav>
//         </aside>

//         {/* Main content */}
//         <main className="flex-1 min-w-0 overflow-y-auto">
//           <div className="max-w-6xl mx-auto p-6 space-y-5">{children}</div>
//         </main>
//       </div>
//     </div>
//   );
// }

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useState, useMemo, useEffect } from "react";
// import { GoSidebarCollapse } from "react-icons/go";
// import { RxDashboard } from "react-icons/rx";
// import { GoPlus, GoFile } from "react-icons/go";
// import { LogoutButton } from "@/components/auth/logout-button";
// import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
// import { MdDocumentScanner } from "react-icons/md"
// import { TiDocumentText } from "react-icons/ti";
// import { CiMemoPad } from "react-icons/ci";

// type NavItem = {
//   label: string;
//   href: string;
//   icon?: React.ReactNode;
//   children?: NavItem[];
// };

// const exceptionRoutes = ["/chat", "/login"];

// export default function AppShell({ children }: { children: React.ReactNode }) {
//   const [isOpen, setIsOpen] = useState(true);
//   const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
//   const pathname = usePathname();
//   const isException = exceptionRoutes.some(route => pathname.startsWith(route));
  
//   const toggleMenu = (label: string) => {
//     setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
//   };

//   const navItems: NavItem[] = useMemo(
//     () => [
//       {
//         label: "Dashboard",
//         href: "/",
//         icon: <RxDashboard size={18} />,
//       },
//       {
//         label: "Company",
//         href: "/company",
//         icon: <HiOutlineBuildingOffice2 size={18} />,
//       },
//       {
//         label: "MOM",
//         href: "/mom",
//         icon: <TiDocumentText size={18} />,
//         children: [
//           { label: "List MOM", href: "/mom/list-mom" },
//           { label: "Create MOM", href: "/mom/create" },
//           { label: "Draft", href: "/nda/draft" },
//         ],
//       },
//       {
//         label: "NDA",
//         href: "/nda",
//         icon: <TiDocumentText size={18} />,
//       },
//       {
//         label: "JIK Module",
//         href: "/jik-module",
//         icon: <MdDocumentScanner size={18} />,
//         children: [
//           { label: "List JIK", href: "/jik-module/list-jik" },
//           { label: "Create", href: "/jik-module/create" },
//           { label: "Draft", href: "/jik-module/draft" },
//         ],
//       },
//       {
//         label: "MOU",
//         href: "/mou",
//         icon: <CiMemoPad size={18} />,
//       },
//     ],
//     []
//   );

//   if (isException) {
//     // ❗ Tetap render children, tapi tanpa shell
//     return <>{children}</>;
//   }

//   const isActive = (href: string) => {
//     // Case khusus: root ("/") hanya aktif kalau bener-bener root
//     if (href === "/") return pathname === "/";

//     // Case khusus: jik-module dianggap aktif di /jik-module atau child-nya
//     if (href === "/jik-module") return pathname === "/jik-module" || pathname.startsWith("/jik-module/");

//     // Default: match hanya kalau path mulai dengan href + "/"
//     return pathname === href || pathname.startsWith(href + "/");
//   };

//   const sidebarWidth = isOpen ? "w-64" : "w-[72px]";

//   useEffect(() => {
//     navItems.forEach((item) => {
//       if (item.children?.some((child) => pathname.startsWith(child.href))) {
//         setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
//       }
//     });
//   }, [pathname, navItems]);

//   return (
//     <div className="w-screen h-screen overflow-hidden flex flex-col">
//       {/* Topbar */}
//       <div className="w-full bg-white shadow z-20 sticky top-0 p-4 flex items-center">
//         <div className="flex items-center w-fit gap-3">
//           {/* Toggle sidebar */}
//           <button
//             type="button"
//             aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
//             aria-expanded={isOpen}
//             onClick={() => setIsOpen(v => !v)}
//             className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
//           >
//             <GoSidebarCollapse
//               size={22}
//               className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
//             />
//           </button>

//           <Link
//             href="/"
//             prefetch
//             className="inline-flex items-center rounded-lg px-2 py-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 whitespace-nowrap"
//           >
//             Main Menu
//           </Link>
//         </div>

//         <h1 className="text-2xl font-bold text-center w-full pr-[72px]">
//           Dashboard Partnership
//         </h1>
//       </div>

//       {/* Body */}
//       <div className="flex flex-1 min-h-0 bg-gray-50">
//         {/* Sidebar (desktop) */}
//         <aside
//           className={`h-full ${sidebarWidth} bg-white border-r shadow-sm transition-all duration-200 ease-in-out hidden md:flex flex-col`}
//         >
//           <div className="p-3"></div>
//           <nav className="px-2 space-y-1">
//             {/* {navItems.map((item) => (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={[
//                   "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                   isActive(item.href)
//                     ? "bg-gray-900 text-white"
//                     : "text-gray-700 hover:bg-gray-100",
//                 ].join(" ")}
//                 title={!isOpen ? item.label : undefined}
//               >
//                 <span className="shrink-0">{item.icon}</span>
//                 <span
//                   className={[
//                     "whitespace-nowrap overflow-hidden transition-all",
//                     isOpen ? "opacity-100" : "opacity-0 w-0",
//                   ].join(" ")}
//                 >
//                   {item.label}
//                 </span>
//               </Link>
//             ))} */}
            
//           </nav>
//           {navItems.map((item) => {
//             const hasChildren = !!item.children?.length;
//             const isMenuOpen = openMenus[item.label];
//             const active = isActive(item.href);

//             return (
//               <div key={item.href}>
//                 {hasChildren ? (
//                   <button
//                     onClick={() => toggleMenu(item.label)}
//                     className={[
//                       "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition text-left",
//                       active
//                         ? "bg-gray-900 text-white"
//                         : "text-gray-700 hover:bg-gray-100",
//                     ].join(" ")}
//                   >
//                     <span className="shrink-0">{item.icon}</span>
//                     {isOpen && (
//                       <span className="flex-1 whitespace-nowrap">{item.label}</span>
//                     )}
//                     {isOpen && (
//                       <span
//                         className={`transition-transform ${
//                           isMenuOpen ? "rotate-90" : "rotate-0"
//                         }`}
//                       >
//                         ▸
//                       </span>
//                     )}
//                   </button>
//                 ) : (
//                   <Link
//                     href={item.href}
//                     className={[
//                       "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                       active
//                         ? "bg-gray-900 text-white"
//                         : "text-gray-700 hover:bg-gray-100",
//                     ].join(" ")}
//                   >
//                     <span className="shrink-0">{item.icon}</span>
//                     {isOpen && (
//                       <span className="flex-1 whitespace-nowrap">{item.label}</span>
//                     )}
//                   </Link>
//                 )}

//                 {/* Submenu */}
//                 {hasChildren && (
//                   <div
//                     className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
//                       isMenuOpen && isOpen ? "max-h-40" : "max-h-0"
//                     }`}
//                   >
//                     {item.children.map((sub) => (
//                       <Link
//                         key={sub.href}
//                         href={sub.href}
//                         className={[
//                           "block rounded-lg px-3 py-2 text-sm transition",
//                           isActive(sub.href)
//                             ? "bg-gray-800 text-white"
//                             : "text-gray-600 hover:bg-gray-100",
//                         ].join(" ")}
//                       >
//                         {sub.label}
//                       </Link>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             );
//           })}

//           <div className="mt-auto p-3 text-[11px] text-gray-400">
//             <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>
//               <LogoutButton />
//             </div>
//             <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>v1.0</div>
//           </div>
//         </aside>

//         {/* Overlay mobile */}
//         {isOpen && (
//           <div
//             className="md:hidden fixed inset-0 bg-black/30 z-10"
//             onClick={() => setIsOpen(false)}
//           />
//         )}

//         {/* Sidebar mobile (tetap di kiri, dengan submenu support) */}
//         <aside
//           className={[
//             "fixed md:hidden top-[64px] bottom-0 left-0 z-20 bg-white border-r shadow-lg w-64 transition-transform duration-300 ease-in-out",
//             isOpen ? "translate-x-0" : "-translate-x-full",
//           ].join(" ")}
//         >
//           <nav className="px-2 py-4 space-y-1 overflow-y-auto">
//             {navItems.map((item) => {
//               const hasChildren = !!item.children?.length;
//               const isMenuOpen = openMenus[item.label];
//               const active = isActive(item.href);

//               return (
//                 <div key={item.href}>
//                   {hasChildren ? (
//                     <button
//                       onClick={() => toggleMenu(item.label)}
//                       className={[
//                         "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition text-left",
//                         active
//                           ? "bg-gray-900 text-white"
//                           : "text-gray-700 hover:bg-gray-100",
//                       ].join(" ")}
//                     >
//                       <div className="flex items-center gap-3">
//                         <span className="shrink-0">{item.icon}</span>
//                         <span>{item.label}</span>
//                       </div>
//                       <span
//                         className={`transition-transform ${
//                           isMenuOpen ? "rotate-90" : "rotate-0"
//                         }`}
//                       >
//                         ▸
//                       </span>
//                     </button>
//                   ) : (
//                     <Link
//                       href={item.href}
//                       className={[
//                         "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                         active
//                           ? "bg-gray-900 text-white"
//                           : "text-gray-700 hover:bg-gray-100",
//                       ].join(" ")}
//                       onClick={() => setIsOpen(false)}
//                     >
//                       <span className="shrink-0">{item.icon}</span>
//                       <span>{item.label}</span>
//                     </Link>
//                   )}

//                   {/* Submenu */}
//                   {hasChildren && (
//                     <div
//                       className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
//                         isMenuOpen ? "max-h-40" : "max-h-0"
//                       }`}
//                     >
//                       {item.children.map((sub) => (
//                         <Link
//                           key={sub.href}
//                           href={sub.href}
//                           className={[
//                             "block rounded-lg px-3 py-2 text-sm transition",
//                             isActive(sub.href)
//                               ? "bg-gray-800 text-white"
//                               : "text-gray-600 hover:bg-gray-100",
//                           ].join(" ")}
//                           onClick={() => setIsOpen(false)}
//                         >
//                           {sub.label}
//                         </Link>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </nav>
//         </aside>

//         {/* Main content */}
//         <main className="flex-1 min-w-0 overflow-y-auto">
//           <div className="max-w-6xl mx-auto p-6 space-y-5">{children}</div>
//         </main>
//       </div>
//     </div>
//   );
// }

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useState, useMemo, useEffect } from "react";
// import { GoSidebarCollapse } from "react-icons/go";
// import { RxDashboard } from "react-icons/rx";
// import { GoPlus, GoFile } from "react-icons/go";
// import { LogoutButton } from "@/components/auth/logout-button";
// import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
// import { MdDocumentScanner } from "react-icons/md"
// import { TiDocumentText } from "react-icons/ti";

// type NavItem = {
//   label: string;
//   href: string;
//   icon?: React.ReactNode;
//   children?: NavItem[];
// };

// const exceptionRoutes = ["/chat", "/login"];

// export default function AppShell({ children }: { children: React.ReactNode }) {
//   const [isOpen, setIsOpen] = useState(true);
//   const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
//   const pathname = usePathname();
//   const isException = exceptionRoutes.some(route => pathname.startsWith(route));
  
//   const toggleMenu = (label: string) => {
//     setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
//   };

//   const navItems: NavItem[] = useMemo(
//     () => [
//       {
//         label: "Dashboard",
//         href: "/",
//         icon: <RxDashboard size={18} />,
//       },
//       {
//         label: "Company",
//         href: "/company",
//         icon: <HiOutlineBuildingOffice2 size={18} />,
//       },
//       {
//         label: "MOM",
//         href: "/mom",
//         icon: <TiDocumentText size={18} />,
//         children: [
//           { label: "List MOM", href: "/mom/list-mom" },
//           { label: "Create MOM", href: "/mom/create" },
//           { label: "Draft", href: "/nda/draft" },
//         ],
//       },
//       {
//         label: "NDA",
//         href: "/nda",
//         icon: <TiDocumentText size={18} />,
//       },
//       {
//         label: "JIK Module",
//         href: "/jik-module",
//         icon: <MdDocumentScanner size={18} />,
//         children: [
//           { label: "List JIK", href: "/jik-module/list-jik" },
//           { label: "Create", href: "/jik-module/create" },
//           { label: "Draft", href: "/jik-module/draft" },
//         ],
//       },
//     ],
//     []
//   );

//   if (isException) {
//     // ❗ Tetap render children, tapi tanpa shell
//     return <>{children}</>;
//   }

//   const isActive = (href: string) => {
//     // Case khusus: root ("/") hanya aktif kalau bener-bener root
//     if (href === "/") return pathname === "/";

//     // Case khusus: jik-module dianggap aktif di /jik-module atau child-nya
//     if (href === "/jik-module") return pathname === "/jik-module" || pathname.startsWith("/jik-module/");

//     // Default: match hanya kalau path mulai dengan href + "/"
//     return pathname === href || pathname.startsWith(href + "/");
//   };

//   const sidebarWidth = isOpen ? "w-64" : "w-[72px]";

//   useEffect(() => {
//     navItems.forEach((item) => {
//       if (item.children?.some((child) => pathname.startsWith(child.href))) {
//         setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
//       }
//     });
//   }, [pathname, navItems]);

//   return (
//     <div className="w-screen h-screen overflow-hidden flex flex-col">
//       {/* Topbar */}
//       <div className="w-full bg-white shadow z-20 sticky top-0 p-4 flex items-center">
//         <div className="flex items-center w-fit gap-3">
//           {/* Toggle sidebar */}
//           <button
//             type="button"
//             aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
//             aria-expanded={isOpen}
//             onClick={() => setIsOpen(v => !v)}
//             className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
//           >
//             <GoSidebarCollapse
//               size={22}
//               className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
//             />
//           </button>

//           <Link
//             href="/"
//             prefetch
//             className="inline-flex items-center rounded-lg px-2 py-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 whitespace-nowrap"
//           >
//             Main Menu
//           </Link>
//         </div>

//         <h1 className="text-2xl font-bold text-center w-full pr-[72px]">
//           Dashboard Partnership
//         </h1>
//       </div>

//       {/* Body */}
//       <div className="flex flex-1 min-h-0 bg-gray-50">
//         {/* Sidebar (desktop) */}
//         <aside
//           className={`h-full ${sidebarWidth} bg-white border-r shadow-sm transition-all duration-200 ease-in-out hidden md:flex flex-col`}
//         >
//           <div className="p-3"></div>
//           <nav className="px-2 space-y-1">
//             {/* {navItems.map((item) => (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={[
//                   "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                   isActive(item.href)
//                     ? "bg-gray-900 text-white"
//                     : "text-gray-700 hover:bg-gray-100",
//                 ].join(" ")}
//                 title={!isOpen ? item.label : undefined}
//               >
//                 <span className="shrink-0">{item.icon}</span>
//                 <span
//                   className={[
//                     "whitespace-nowrap overflow-hidden transition-all",
//                     isOpen ? "opacity-100" : "opacity-0 w-0",
//                   ].join(" ")}
//                 >
//                   {item.label}
//                 </span>
//               </Link>
//             ))} */}
            
//           </nav>
//           {navItems.map((item) => {
//             const hasChildren = !!item.children?.length;
//             const isMenuOpen = openMenus[item.label];
//             const active = isActive(item.href);

//             return (
//               <div key={item.href}>
//                 {hasChildren ? (
//                   <button
//                     onClick={() => toggleMenu(item.label)}
//                     className={[
//                       "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition text-left",
//                       active
//                         ? "bg-gray-900 text-white"
//                         : "text-gray-700 hover:bg-gray-100",
//                     ].join(" ")}
//                   >
//                     <span className="shrink-0">{item.icon}</span>
//                     {isOpen && (
//                       <span className="flex-1 whitespace-nowrap">{item.label}</span>
//                     )}
//                     {isOpen && (
//                       <span
//                         className={`transition-transform ${
//                           isMenuOpen ? "rotate-90" : "rotate-0"
//                         }`}
//                       >
//                         ▸
//                       </span>
//                     )}
//                   </button>
//                 ) : (
//                   <Link
//                     href={item.href}
//                     className={[
//                       "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                       active
//                         ? "bg-gray-900 text-white"
//                         : "text-gray-700 hover:bg-gray-100",
//                     ].join(" ")}
//                   >
//                     <span className="shrink-0">{item.icon}</span>
//                     {isOpen && (
//                       <span className="flex-1 whitespace-nowrap">{item.label}</span>
//                     )}
//                   </Link>
//                 )}

//                 {/* Submenu */}
//                 {hasChildren && (
//                   <div
//                     className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
//                       isMenuOpen && isOpen ? "max-h-40" : "max-h-0"
//                     }`}
//                   >
//                     {item.children.map((sub) => (
//                       <Link
//                         key={sub.href}
//                         href={sub.href}
//                         className={[
//                           "block rounded-lg px-3 py-2 text-sm transition",
//                           isActive(sub.href)
//                             ? "bg-gray-800 text-white"
//                             : "text-gray-600 hover:bg-gray-100",
//                         ].join(" ")}
//                       >
//                         {sub.label}
//                       </Link>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             );
//           })}

//           <div className="mt-auto p-3 text-[11px] text-gray-400">
//             <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>
//               <LogoutButton />
//             </div>
//             <div className={isOpen ? "opacity-100" : "opacity-0 w-0"}>v1.0</div>
//           </div>
//         </aside>

//         {/* Overlay mobile */}
//         {isOpen && (
//           <div
//             className="md:hidden fixed inset-0 bg-black/30 z-10"
//             onClick={() => setIsOpen(false)}
//           />
//         )}

//         {/* Sidebar mobile (tetap di kiri, dengan submenu support) */}
//         <aside
//           className={[
//             "fixed md:hidden top-[64px] bottom-0 left-0 z-20 bg-white border-r shadow-lg w-64 transition-transform duration-300 ease-in-out",
//             isOpen ? "translate-x-0" : "-translate-x-full",
//           ].join(" ")}
//         >
//           <nav className="px-2 py-4 space-y-1 overflow-y-auto">
//             {navItems.map((item) => {
//               const hasChildren = !!item.children?.length;
//               const isMenuOpen = openMenus[item.label];
//               const active = isActive(item.href);

//               return (
//                 <div key={item.href}>
//                   {hasChildren ? (
//                     <button
//                       onClick={() => toggleMenu(item.label)}
//                       className={[
//                         "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition text-left",
//                         active
//                           ? "bg-gray-900 text-white"
//                           : "text-gray-700 hover:bg-gray-100",
//                       ].join(" ")}
//                     >
//                       <div className="flex items-center gap-3">
//                         <span className="shrink-0">{item.icon}</span>
//                         <span>{item.label}</span>
//                       </div>
//                       <span
//                         className={`transition-transform ${
//                           isMenuOpen ? "rotate-90" : "rotate-0"
//                         }`}
//                       >
//                         ▸
//                       </span>
//                     </button>
//                   ) : (
//                     <Link
//                       href={item.href}
//                       className={[
//                         "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                         active
//                           ? "bg-gray-900 text-white"
//                           : "text-gray-700 hover:bg-gray-100",
//                       ].join(" ")}
//                       onClick={() => setIsOpen(false)}
//                     >
//                       <span className="shrink-0">{item.icon}</span>
//                       <span>{item.label}</span>
//                     </Link>
//                   )}

//                   {/* Submenu */}
//                   {hasChildren && (
//                     <div
//                       className={`pl-9 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
//                         isMenuOpen ? "max-h-40" : "max-h-0"
//                       }`}
//                     >
//                       {item.children.map((sub) => (
//                         <Link
//                           key={sub.href}
//                           href={sub.href}
//                           className={[
//                             "block rounded-lg px-3 py-2 text-sm transition",
//                             isActive(sub.href)
//                               ? "bg-gray-800 text-white"
//                               : "text-gray-600 hover:bg-gray-100",
//                           ].join(" ")}
//                           onClick={() => setIsOpen(false)}
//                         >
//                           {sub.label}
//                         </Link>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </nav>
//         </aside>

//         {/* Main content */}
//         <main className="flex-1 min-w-0 overflow-y-auto">
//           <div className="max-w-6xl mx-auto p-6 space-y-5">{children}</div>
//         </main>
//       </div>
//     </div>
//   );
// }