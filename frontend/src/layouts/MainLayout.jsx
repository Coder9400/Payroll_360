import * as React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNavbar } from '../components/layout/TopNavbar';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { routeBreadcrumbs, dynamicBreadcrumbs } from '../config/navigationConfig';

/** Resolve breadcrumb items for the current pathname.
 *  Priority: exact static match → dynamic regex match → Dashboard fallback. */
function resolveBreadcrumbs(pathname) {
  if (routeBreadcrumbs[pathname]) return routeBreadcrumbs[pathname];
  for (const [regex, builder] of dynamicBreadcrumbs) {
    if (regex.test(pathname)) return builder(pathname);
  }
  return [{ name: 'Dashboard', href: '/dashboard' }];
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();

  const breadcrumbItems = resolveBreadcrumbs(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Breadcrumb bar */}
        <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 py-2 sm:px-6 lg:px-8">
          <Breadcrumb items={breadcrumbItems} className="mb-0" />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
