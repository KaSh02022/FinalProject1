import { useId, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { suggestInvitees } from "../../utils/userSuggest.js";
import { avatarToneClass, getInitials } from "../../utils/avatar.js";

/**
 * Email field of "Invite a member" with account suggestions (ARIA 1.2 combobox + listbox).
 * Typing filters the accounts by name or email; ↑/↓ move, Enter picks, Esc closes the list
 * (the Modal leaves Esc alone while the list is open). Any email can still be typed by hand.
 *
 * @param {string}   value
 * @param {Function} onChange       (email) => void
 * @param {Array}    users          accounts from GET /user (may be empty when the list failed)
 * @param {Array}    members        current project members (excluded from the suggestions)
 * @param {boolean}  loadingUsers
 * @param {string}   usersError     shown under the field — suggestions are a convenience, not required
 */
function InviteCombobox({ id, value, onChange, users, members, loadingUsers, usersError, invalid, describedBy }) {
    const listId = useId();
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const suggestions = useMemo(() => suggestInvitees(users, members, value), [users, members, value]);
    const expanded = open && value.trim() !== "" && (suggestions.length > 0 || !loadingUsers);

    const pick = (user) => {
        onChange(user.email);
        setOpen(false);
        setActive(-1);
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!suggestions.length) return;
            e.preventDefault();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter" && expanded && active >= 0 && suggestions[active]) {
            e.preventDefault();
            pick(suggestions[active]);
        } else if (e.key === "Escape" && expanded) {
            setOpen(false);
            setActive(-1);
        }
    };

    const optionId = (i) => `${listId}-opt-${i}`;

    return (
        <div className="combobox">
            <input
                id={id}
                className="input"
                type="email"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                autoComplete="off"
                placeholder="Type a name or email…"
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
                onFocus={() => setOpen(true)}
                // a click on an option happens before blur thanks to onMouseDown preventDefault
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                required
            />
            {expanded && (
                <ul id={listId} role="listbox" className="combobox-list" aria-label="Matching accounts">
                    {suggestions.map((user, i) => {
                        const name = user.username || user.name || user.email;
                        return (
                            <li
                                key={user._id || user.email}
                                id={optionId(i)}
                                role="option"
                                aria-selected={i === active}
                                className={`combobox-option${i === active ? " is-active" : ""}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(user)}
                                onMouseEnter={() => setActive(i)}
                            >
                                <span className={`avatar avatar-sm ${avatarToneClass(user._id)}`} aria-hidden="true">{getInitials(name)}</span>
                                <span className="combobox-option-text">
                                    <span className="combobox-option-name">{name}</span>
                                    <span className="combobox-option-meta">{user.email}</span>
                                </span>
                            </li>
                        );
                    })}
                    {suggestions.length === 0 && (
                        <li className="combobox-empty" role="presentation">No matching account — you can still invite by exact email.</li>
                    )}
                </ul>
            )}
            {loadingUsers && (
                <p className="field-hint"><Loader2 className="icon icon-sm animate-spin" aria-hidden="true" /> Loading accounts…</p>
            )}
            {!loadingUsers && usersError && <p className="field-hint">{usersError}</p>}
        </div>
    );
}

export default InviteCombobox;
