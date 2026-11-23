"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmModal({ isOpen, onClose }: LogoutConfirmModalProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
    router.push("/login");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xs text-center p-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FFE4E6] text-[#E11D48] mb-3">
        <LogOut className="h-6 w-6" />
      </div>

      <h3 className="text-base font-bold text-[#17133A] dark:text-[#FAF8FF]">
        Log Out of ElderCare OS?
      </h3>

      <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-1.5 mb-5 leading-relaxed">
        Are you sure you want to log out? Your active session will be ended securely.
      </p>

      <div className="flex items-center gap-2.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="w-full rounded-xl text-xs font-semibold"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          className="w-full rounded-xl text-xs font-semibold"
        >
          Log Out
        </Button>
      </div>
    </Modal>
  );
}
