
import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

type Role = 'admin' | 'editor' | 'viewer';

const useRBAC = (requiredRole: Role) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // In a real app, you'd get the user's role from your database
        // For this example, we'll assign a role based on the user's email
        if (currentUser.email === 'admin@cartelworx.com') {
          setRole('admin');
        } else if (currentUser.email?.endsWith('@cartelworx.com')) {
          setRole('editor');
        } else {
          setRole('viewer');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role) {
      // Simple role hierarchy: admin > editor > viewer
      const roleHierarchy = {
        admin: 3,
        editor: 2,
        viewer: 1,
      };
      setIsAuthorized(roleHierarchy[role] >= roleHierarchy[requiredRole]);
    } else {
      setIsAuthorized(false);
    }
  }, [role, requiredRole]);

  return { user, role, loading, isAuthorized };
};

export default useRBAC;
