import type { AuthenticatedUser } from '@app/identity/application/ports';
import type { RecipientView } from '@app/notification-delivery/application/ports';
import type { UserPickerOption } from '@app/notification-delivery/interface/send-notification-form';

export function mergeUserPickerOptions(
  users: AuthenticatedUser[],
  recipients: RecipientView[],
): UserPickerOption[] {
  return users.map((user) => {
    const recipient = recipients.find((r) => r.username === user.id);
    const subscribed = recipient?.subscribed ?? false;
    const suffix = subscribed ? '' : ' (no active subscription)';
    return { id: user.id, label: `${user.email} (${user.role})${suffix}` };
  });
}
