import SupplierToken from "../models/supplierToken.model";

export const addSupplierToken = async tokenData => {
  try {
    const { token, itemId, quantity, date, supplier, expiresAt } = tokenData;

    // Hash the token before storing 
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const newSupplierToken = new SupplierToken({
      token: tokenHash, // Store hash instead of plain token
      itemId,
      quantity,
      date,
      supplier,
      expiresAt,
      status: "PENDING",
      createdAt: new Date(),
    });

    await newSupplierToken.save();
    return { message: "Supplier token added successfully" };
  } catch (error) {
    console.log(error);
    throw new Error("Internal server error");
  }
};

// FIX 5: SECURE TOKEN VALIDATION WITH JWT AND EXPIRATION
export const validateToken = async tokenToValidate => {
  try {
    // verify JWT signature and expiration
    let decodedToken;
    try {
      decodedToken = jwt.verify(
        tokenToValidate, 
        process.env.JWT_SECRET || 'your-super-secret-key',
        {
          issuer: 'fashion-retail-store',
          audience: 'supplier-confirmation'
        }
      );
    } catch (jwtError) {
      console.log('JWT validation failed:', jwtError.message);
      return {
        valid: false,
        message: "Invalid or expired token.",
      };
    }
    
    // Find token in database
    const foundToken = await SupplierToken.findOne({ 
      token: tokenToValidate,
      status: 'PENDING' // Only validate pending tokens
    }).populate('supplier');
    
    if (!foundToken) {
      return {
        valid: false,
        message: "Token not found or already processed.",
      };
    }
    
    // Check database-level expiration
    if (foundToken.expiresAt && new Date() > foundToken.expiresAt) {
      return {
        valid: false,
        message: "Token has expired.",
      };
    }
    
    // Validate token belongs to correct supplier
    if (foundToken.supplier.email !== decodedToken.supplierEmail) {
      return {
        valid: false,
        message: "Token validation failed.",
      };
    }
    
    return {
      valid: true,
      token: foundToken,
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      valid: false,
      message: "Token validation failed.",
    };
  }
};

export const fetchStockOrders = async (req, res) => {
  try {
    const orderList = await SupplierToken.find({}).populate("supplier");
    res.status(200).json({ orders: orderList });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTokenStatus = async (tokenId, newStatus) => {
  try {
    const updatedToken = await SupplierToken.findOneAndUpdate(
      {token: tokenId},
      {
        status: newStatus,
      },
      { new: true }
    );

    if (updatedToken) {
      return { message: "Token status updated successfully" };
    } else {
      return { message: "Error updating status " };
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error.message });
  }
};
