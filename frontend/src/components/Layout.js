import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useSocket } from '../services/SocketContext';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
  UsersIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Flags', href: '/flags', icon: FlagIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
];

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent />
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  SafeChat AI
                </h1>
                <div className="ml-4 flex items-center">
                  {connected ? (
                    <div className="flex items-center text-green-600">
                      <SignalIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">Live</span>
                      <div className="ml-2 h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <SignalSlashIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">Offline</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="font-medium">{user?.username}</span>
                  <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  function SidebarContent() {
    return (
      <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">SafeChat AI</span>
            </div>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isCurrentPath(item.href)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-6 w-6 transition-colors duration-200 ${
                      isCurrentPath(item.href)
                        ? 'text-primary-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full bg-gray-300"
                src={`https://ui-avatars.com/api/?name=${user?.username}&background=3b82f6&color=fff`}
                alt=""
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.username}</p>
              <p className="text-xs font-medium text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default Layout;