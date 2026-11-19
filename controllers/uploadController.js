import axios from "axios";
import FormData from "form-data";

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const formData = new FormData();

    formData.append("image", req.file.buffer.toString("base64"));

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: response.data.data.url,
    });
  } catch (error) {
    console.error("Image upload failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
};