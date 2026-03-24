import React from 'react';
import Card from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';

const AdminProfile = () => {
  const { user } = useAuth();

  const displayName = user?.name || user?.fullName || 'Super Admin';
  const email = user?.email || 'Not set';
  const role = user?.role || 'superadmin';
  const phone = user?.phone || 'Not set';
  const address = user?.address || 'Not set';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Super admin profile details</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{phone}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{address}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;
