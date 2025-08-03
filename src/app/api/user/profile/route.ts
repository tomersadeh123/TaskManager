import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/utils/jwt';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@/lib/logger';

cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
  secure: true
});

// GET /api/user/profile - Get current user profile
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.logRequest(request, requestId);
    await connectDB();
    
    // Get token from header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      logger.logAuth('profile_access_failed', undefined, false, {
        reason: 'no_token',
        requestId
      });
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    const dbStart = Date.now();
    const user = await User.findById(decoded.id).select('-password');
    const dbDuration = Date.now() - dbStart;
    
    if (!user) {
      logger.logAuth('profile_access_failed', decoded.id, false, {
        reason: 'user_not_found',
        requestId,
        dbDuration
      });
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    logger.logDatabase('findById', 'users', dbDuration, undefined, { userId: user._id });
    
    const duration = Date.now() - startTime;
    logger.logBusinessEvent('profile_viewed', user._id.toString(), 'user', user._id.toString(), {
      userName: user.userName
    });
    
    logger.logResponse(requestId, 200, duration, user._id.toString());

    return NextResponse.json(user);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error fetching profile', error as Error, { requestId, duration });
    logger.logResponse(requestId, 401, duration);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.logRequest(request, requestId);
    await connectDB();
    
    // Get token from header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    // Check if request contains FormData (file upload) or JSON
    const contentType = request.headers.get('content-type');
    
    interface ProfileUpdateBody {
      userName?: string;
      email?: string;
      address?: string;
      bio?: string;
      timezone?: string;
      theme?: string;
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    }
    
    let body: ProfileUpdateBody;
    let avatarFile: File | null = null;

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (file upload)
      const formData = await request.formData();
      
      // Extract form fields
      body = {
        userName: formData.get('userName') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        bio: formData.get('bio') as string,
        timezone: formData.get('timezone') as string,
        theme: formData.get('theme') as string,
        emailNotifications: formData.get('emailNotifications') === 'true',
        pushNotifications: formData.get('pushNotifications') === 'true'
      };
      
      // Extract avatar file if present
      avatarFile = formData.get('avatar') as File;
    } else {
      // Handle JSON (regular update)
      body = await request.json();
    }

    const { userName, email, address, bio, timezone, theme, emailNotifications, pushNotifications } = body;

    // Check if username or email already exists (excluding current user)
    if (userName && userName !== user.userName) {
      const existingUserName = await User.findOne({ 
        userName, 
        _id: { $ne: user._id } 
      });
      if (existingUserName) {
        return NextResponse.json(
          { message: 'Username already exists' }, 
          { status: 400 }
        );
      }
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email, 
        _id: { $ne: user._id } 
      });
      if (existingEmail) {
        return NextResponse.json(
          { message: 'Email already exists' }, 
          { status: 400 }
        );
      }
    }

    // Handle avatar upload if present
    let avatarUrl = user.avatar; // Keep existing avatar by default
    
    if (avatarFile && avatarFile.size > 0) {
      try {
        // Convert File to base64 for Cloudinary upload
        const bytes = await avatarFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Data = `data:${avatarFile.type};base64,${buffer.toString('base64')}`;
        
        // Upload to Cloudinary
        const uploadResult = await uploadImage(base64Data);
        avatarUrl = uploadResult.secure_url;
        
        console.log('Avatar uploaded successfully:', uploadResult.secure_url);
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError);
        return NextResponse.json(
          { message: 'Failed to upload avatar image' }, 
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        userName: userName || user.userName,
        email: email || user.email,
        address: address !== undefined ? address : user.address,
        bio: bio !== undefined ? bio : user.bio,
        avatar: avatarUrl,
        timezone: timezone || user.timezone,
        theme: theme || user.theme,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : user.emailNotifications,
        pushNotifications: pushNotifications !== undefined ? pushNotifications : user.pushNotifications
      },
      { new: true, select: '-password' }
    );

    const duration = Date.now() - startTime;
    logger.logBusinessEvent('profile_updated', user._id.toString(), 'user', user._id.toString(), {
      updatedFields: Object.keys(body).filter(key => body[key as keyof ProfileUpdateBody] !== undefined),
      hasAvatarUpload: !!(avatarFile && avatarFile.size > 0)
    });
    
    logger.logResponse(requestId, 200, duration, user._id.toString());

    return NextResponse.json(updatedUser);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error updating profile', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}


const uploadImage = async (imagePath: string) => {
  // Use the uploaded file's name as the asset's public ID and 
  // allow overwriting the asset with new versions
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    folder: 'user-avatars', // Organize uploads in folders
    transformation: [
      { width: 400, height: 400, crop: 'fill' }, // Auto-resize to 400x400
      { quality: 'auto', fetch_format: 'auto' } // Auto-optimize quality and format
    ]
  };

  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(imagePath, options);
    console.log('Cloudinary upload result:', result);
    return {
      public_id: result.public_id,
      secure_url: result.secure_url
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};