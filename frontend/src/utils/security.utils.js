const securityUtils = {
  // Sanitize input to prevent XSS
  sanitizeInput: (input) => {
    if (typeof input !== "string") return "";
    return input.replace(/[<>\"'&]/g, (match) => {
      const entities = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entities[match];
    });
  },

  // Validate ID parameter (only allow alphanumeric and hyphens)
  validateId: (id) => {
    if (typeof id !== "string") return false;
    return /^[a-zA-Z0-9\-_]{1,50}$/.test(id);
  },

  // Validate blob content type
  validateContentType: (blob, expectedType) => {
    return blob.type === expectedType;
  },

  // Safe file download function
  safeDownload: (blob, filename, expectedContentType) => {
    try {
      // Validate blob content type
      if (!securityUtils.validateContentType(blob, expectedContentType)) {
        throw new Error("Invalid content type received");
      }

      // Sanitize filename
      const safeFilename = securityUtils
        .sanitizeInput(filename)
        .replace(/[^a-zA-Z0-9.-]/g, "_"); // Allow only safe characters

      // Create blob URL
      const url = window.URL.createObjectURL(blob);

      // Create download link with security measures
      const link = document.createElement("a");

      // Set attributes safely
      link.style.display = "none"; // Hide link
      link.href = url;
      link.setAttribute("download", safeFilename);
      link.setAttribute("rel", "noopener noreferrer"); // Security measure

      // Add to DOM briefly for download
      document.body.appendChild(link);
      link.click();

      // Cleanup immediately
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Secure download failed:", error);
      throw error;
    }
  },
};
