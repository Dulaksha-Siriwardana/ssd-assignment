import CommonForm from "@/components/common/form";
import { Link } from "react-router-dom";
import { loginFormControls } from "@/config";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { loginUser, clearNotifications } from "@/redux/authSlice";
import { toast } from "react-toastify";
import GoogleLoginButton from "@/components/GoogleLoginButton";


const initialState = {
  username: "",
  password: "",
};

const AuthLogin = () => {
  const [formData, setFormData] = useState(initialState);

  const dispatch = useDispatch();

  function onSubmit(event) {
    event.preventDefault();
    console.log(formData);

    dispatch(loginUser(formData))
      .then((result) => {
        if (result.type === "auth/login/fulfilled") {
          if (result.payload.success) {
            const userData = result.payload.user;
            if (
              userData &&
              userData.notifications &&
              userData.notifications.length > 0
            ) {
              userData.notifications.forEach((notification) => {
                toast.info(notification); // Show toast notification
              });

              // Clear notifications from backend
              if (userData.email) {
                dispatch(clearNotifications(userData.email))
                  .then((clearResult) => {
                    clearResult.type === "auth/clearNotifications/fulfilled";
                  })
                  .catch(() => {
                    toast.error("Failed to clear notifications");
                  });
              }
            }
          } else {
            // Handle case where request is successful but login failed
            const errorMessage = result.payload.message || "Login failed";
            toast.error(errorMessage);
          }
        } else if (result.type === "auth/login/rejected") {
          // Handle specific login errors
          const errorMessage = result.payload?.message || "Login failed";
          toast.error(errorMessage);
        }
      })
      .catch((error) => {
        toast.error("An unexpected error occurred");
      });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome Back!
        </h1>
        <p className="mt-2">
          Do not have an account?
          <Link
            className="font-medium ml-2 text-primary hover:underline"
            to="/auth/signup"
          >
            Sign Up
          </Link>
        </p>
      </div>
      <CommonForm
        formControls={loginFormControls}
        buttonText={"Sign Up"}
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSubmit}
      />
      <div className="flex flex-col items-center justify-center pt-6">
       <h2 className="text-l font-semibold mb-3">Or continue with</h2>
        <GoogleLoginButton />
      </div>

    </div>
  );
};

export default AuthLogin;
