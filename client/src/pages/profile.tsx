import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import UserProfile from "@/components/profile/UserProfile";

const Profile: React.FC = () => {
  return (
    <MainLayout
      title="Profile"
      subtitle="Manage your profile and preferences"
    >
      <div className="flex-1 overflow-auto">
        <UserProfile />
      </div>
    </MainLayout>
  );
};

export default Profile;
