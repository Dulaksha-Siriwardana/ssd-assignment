import React from "react";
import { FcGoogle } from "react-icons/fc"; // Google icon

export default function GoogleLoginButton() {
  const handleLogin = () => {
    // Redirect to backend Google login route
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/google/login`;
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center justify-center w-full gap-3 px-4 py-2 border rounded-lg shadow-sm bg-white hover:shadow-md transition"
    >
      <FcGoogle className="text-xl" />
      <span className="text-gray-700 font-medium">Login with Google</span>
    </button>
  );
}
