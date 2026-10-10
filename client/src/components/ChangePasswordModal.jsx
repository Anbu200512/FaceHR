import { useForm } from 'react-hook-form';
import api, { extractError } from '../services/api';
import { useToast } from '../context/ToastContext';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input } from './ui/Form';

export default function ChangePasswordModal({ open, onClose }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();
  const toast = useToast();

  const submit = async (values) => {
    if (!values.currentPassword) return toast.error('Please enter your current password');
    if (!values.newPassword || values.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (values.newPassword !== values.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed successfully');
      reset();
      onClose();
    } catch (err) {
      toast.error(extractError(err, 'Could not change password'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change Password" size="sm">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Current password"
          type="password"
          name="currentPassword"
          register={register}
          error={errors.currentPassword?.message}
          placeholder="Enter current password"
          {...{ 'aria-required': true }}
        />
        <Input
          label="New password"
          type="password"
          name="newPassword"
          register={register}
          error={errors.newPassword?.message}
          placeholder="At least 6 characters"
        />
        <Input
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          register={register}
          error={errors.confirmPassword?.message}
          placeholder="Repeat new password"
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Update Password</Button>
        </div>
      </form>
    </Modal>
  );
}