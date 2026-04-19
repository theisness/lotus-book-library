'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getBackendAPIBaseUrl } from '@/services/environment';
import { fetchWithAuth } from '@/utils/fetch';
import { PiArrowLeft } from 'react-icons/pi';

interface Member {
  id: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
}

export default function AdminMembersPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.replace('/library');
      return;
    }
    loadMembers();
  }, [user, isAdmin, router]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${getBackendAPIBaseUrl()}/admin/members`, {});
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (member: Member) => {
    setToggling(member.id);
    try {
      await fetchWithAuth(`${getBackendAPIBaseUrl()}/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !member.isAdmin }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, isAdmin: !m.isAdmin } : m)),
      );
    } finally {
      setToggling(null);
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <div className='bg-base-100 min-h-screen p-6'>
      <div className='mx-auto max-w-3xl'>
        <div className='mb-6 flex items-center gap-3'>
          <button onClick={() => router.back()} className='btn btn-ghost btn-sm'>
            <PiArrowLeft size={20} />
          </button>
          <h1 className='text-2xl font-bold'>成员管理</h1>
        </div>

        {loading ? (
          <div className='flex justify-center py-12'>
            <span className='loading loading-spinner loading-lg' />
          </div>
        ) : (
          <div className='bg-base-200 overflow-hidden rounded-lg'>
            <table className='table w-full'>
              <thead>
                <tr>
                  <th>邮箱</th>
                  <th>注册时间</th>
                  <th>管理员</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className='hover'>
                    <td className='max-w-xs truncate'>{member.email}</td>
                    <td className='whitespace-nowrap text-sm'>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <input
                        type='checkbox'
                        checked={member.isAdmin}
                        disabled={toggling === member.id || member.id === user.id}
                        onChange={() => handleToggleAdmin(member)}
                        className='toggle toggle-sm toggle-primary'
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
