export function validateProfilePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Provide valid profile details." };
  }

  const { name, email, profileImage = "" } = body;
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedImage = typeof profileImage === "string" ? profileImage.trim() : null;

  if (!normalizedName || normalizedName.length > 80) {
    return { error: "Name is required and must be 80 characters or fewer." };
  }
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return { error: "Enter a valid email address." };
  }
  if (normalizedImage === null) {
    return { error: "Profile image must be a valid HTTP or HTTPS URL." };
  }
  if (normalizedImage) {
    try {
      const imageUrl = new URL(normalizedImage);
      if (!["http:", "https:"].includes(imageUrl.protocol)) {
        return { error: "Profile image must be a valid HTTP or HTTPS URL." };
      }
    } catch {
      return { error: "Profile image must be a valid HTTP or HTTPS URL." };
    }
  }

  return {
    value: {
      name: normalizedName,
      email: normalizedEmail,
      profileImage: normalizedImage
    }
  };
}
