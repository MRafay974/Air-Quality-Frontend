import React from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ isSidebarCollapsed, setSidebarCollapsed, userInfo }) => {
  // Check if user is admin
  const isAdmin = userInfo?.isAdmin;

  return (
    <div
      className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ${
        isSidebarCollapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center border-b border-gray-700">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-md flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-5 h-5"
          >
            <path d="M3.055 13H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {!isSidebarCollapsed && <span className="ml-3 text-gray-200 font-semibold">AirQuality</span>}
      </div>

      {/* Menu Items */}
      <div className="py-4">
        <Link to="/dashboard" onClick={() => setSidebarCollapsed(false)}>
          <button
            className={`w-full flex items-center px-4 py-2 ${
              isSidebarCollapsed ? "text-gray-400" : "text-white"
            } hover:bg-blue-500 transition duration-300`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            {!isSidebarCollapsed && <span className="ml-3">Dashboard</span>}
          </button>
        </Link>

        {/* Only show Devices menu item for admins */}
        {isAdmin && (
          <Link to="/devices" onClick={() => setSidebarCollapsed(false)}>
            <button
              className={`w-full flex items-center px-4 py-2 ${
                isSidebarCollapsed ? "text-gray-400" : "text-white"
              } hover:bg-blue-500 transition duration-300`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              {!isSidebarCollapsed && <span className="ml-3">Devices</span>}
            </button>
          </Link>
        )}

        {/* Only show Users menu item for admins */}
        {isAdmin && (
          <Link to="/users" onClick={() => setSidebarCollapsed(false)}>
            <button
              className={`w-full flex items-center px-4 py-2 ${
                isSidebarCollapsed ? "text-gray-400" : "text-white"
              } hover:bg-blue-500 transition duration-300`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {!isSidebarCollapsed && <span className="ml-3">Users</span>}
            </button>
          </Link>
        )}

        <Link to="/alerts" onClick={() => setSidebarCollapsed(false)}>
          <button
            className={`w-full flex items-center px-4 py-2 ${
              isSidebarCollapsed ? "text-gray-400" : "text-white"
            } hover:bg-blue-500 transition duration-300`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {!isSidebarCollapsed && <span className="ml-3">Alerts</span>}
          </button>
        </Link>

        <Link to="/notifications" onClick={() => setSidebarCollapsed(false)}>
          <button
            className={`w-full flex items-center px-4 py-2 ${
              isSidebarCollapsed ? "text-gray-400" : "text-white"
            } hover:bg-blue-500 transition duration-300`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            {!isSidebarCollapsed && <span className="ml-3">Notifications</span>}
          </button>
        </Link>
      </div>

{/* Collapse Button */}
<div className="px-4 py-2 fixed bottom-0 left-0 w-full border-t border-gray-700">
  <button
    onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
    className="flex items-center justify-center w-full text-gray-400 hover:text-white py-3"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-5 w-5 transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
    {!isSidebarCollapsed && <span className="ml-2">Collapse</span>}
  </button>
</div>
    </div>
  );
};

export default Sidebar;