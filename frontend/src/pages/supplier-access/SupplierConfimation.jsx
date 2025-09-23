import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useToast } from "@/hooks/use-toast";

const SupplierConfirmation = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();

  // FIX 9: SECURE TOKEN VALIDATION WITH TIMEOUT
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 10000)
        );

        const validatePromise = dispatch(validateToken(tokenId)).unwrap();

        const result = await Promise.race([validatePromise, timeoutPromise]);

        if (result.valid) {
          setTokenData(result.token);
        } else {
          setError(result.message || "Invalid token. Access denied.");
          // Redirect after showing error
          setTimeout(() => navigate("/"), 3000);
        }
      } catch (err) {
        console.error("Token validation failed:", err);
        setError("Token validation failed. Access denied.");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    if (tokenId) {
      checkToken();
    } else {
      setError("No token provided.");
      navigate("/");
    }
  }, [tokenId, dispatch, navigate]);

  // FIX 10: SECURE BUTTON HANDLERS WITH RATE LIMITING
  const handleStatusUpdate = async (status) => {
    if (isProcessing) return; // Prevent double-clicking

    setIsProcessing(true);
    try {
      const result = await dispatch(
        updateTokenStatus({ tokenId, status })
      ).unwrap();

      if (result.success) {
        setIsDisabled(true);
        toast({
          title: status === "ACCEPTED" ? "Order Accepted" : "Order Declined",
          description: "Thank you for your response.",
        });

        // Refresh stock orders
        dispatch(fetchStockOrders());

        // Redirect after success
        setTimeout(() => navigate("/supplier-dashboard"), 2000);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update token status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = () => handleStatusUpdate("ACCEPTED");
  const handleDeny = () => handleStatusUpdate("DECLINED");


  return (
    <div className="container mx-auto p-4">
    
      {tokenData && !isDisabled && (
        <div className="flex justify-center mt-10 space-x-4">
          <Button
            onClick={handleAccept}
            className="w-80 hover:bg-green-700"
            disabled={isDisabled || isProcessing}
          >
            {isProcessing ? "Processing..." : "Accept"}
          </Button>

          <Button
            onClick={handleDeny}
            className="w-80 bg-slate-500 hover:bg-red-700"
            disabled={isDisabled || isProcessing}
          >
            {isProcessing ? "Processing..." : "Deny"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SupplierConfirmation;
