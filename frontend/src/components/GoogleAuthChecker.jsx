import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { checkGoogleAuth } from '@/redux/authSlice';

const GoogleAuthChecker = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check Google OAuth authentication status on app startup
    dispatch(checkGoogleAuth());
  }, [dispatch]);

  return <>{children}</>;
};

export default GoogleAuthChecker;
