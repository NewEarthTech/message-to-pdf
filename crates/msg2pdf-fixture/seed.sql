-- Synthetic fixture data. Every handle, name, and message is invented for testing.
-- NO real message content ever belongs in this file.
--
-- Dates are Apple-epoch nanoseconds: (unix_seconds - 978307200) * 1e9. They are
-- computed with strftime so the SQL stays readable. Three 1:1 conversations, with
-- distinct last-message dates so the newest-first ordering is observable:
--   chat 1  Alex Rivera   +15551234567   2024-06-10  (6 messages, incl. emoji + attachment)
--   chat 2  Sam Chen      sam@example.com 2024-05-20  (3 messages)
--   chat 3  (raw handle)  +15559876543   2024-03-01  (2 messages)

INSERT INTO handle (ROWID, id, service, country) VALUES
  (1, '+15551234567', 'iMessage', 'us'),
  (2, 'sam@example.com', 'iMessage', NULL),
  (3, '+15559876543', 'SMS', 'us');

INSERT INTO chat (ROWID, guid, style, state, chat_identifier, service_name, display_name) VALUES
  (1, 'iMessage;-;+15551234567', 45, 3, '+15551234567', 'iMessage', 'Alex Rivera'),
  (2, 'iMessage;-;sam@example.com', 45, 3, 'sam@example.com', 'iMessage', 'Sam Chen'),
  (3, 'SMS;-;+15559876543', 45, 3, '+15559876543', 'SMS', NULL);

INSERT INTO chat_handle_join (chat_id, handle_id) VALUES (1, 1), (2, 2), (3, 3);

-- chat 1 · Alex Rivera
INSERT INTO message (ROWID, guid, text, handle_id, is_from_me, is_sent, is_delivered, is_read, cache_has_attachments, service, type, item_type, date, date_delivered, date_read) VALUES
  (1, 'FIX-1-0001', 'Hey! Are we still on for lunch tomorrow?', 1, 0, 0, 0, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-06-10 16:00:00') AS INTEGER) - 978307200) * 1000000000, 0, 0),
  (2, 'FIX-1-0002', 'Yes! Noon at the usual place 🥗', 0, 1, 1, 1, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-06-10 16:01:00') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-06-10 16:01:04') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-06-10 16:02:11') AS INTEGER) - 978307200) * 1000000000),
  (3, 'FIX-1-0003', 'Perfect. Want me to book a table?', 1, 0, 0, 0, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-06-10 16:03:00') AS INTEGER) - 978307200) * 1000000000, 0, 0),
  (4, 'FIX-1-0004', 'Already did — table for two at 12.', 0, 1, 1, 1, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-06-10 16:04:00') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-06-10 16:04:03') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-06-10 16:04:39') AS INTEGER) - 978307200) * 1000000000),
  (5, 'FIX-1-0005', NULL, 0, 1, 1, 1, 0, 1, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-06-10 16:05:00') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-06-10 16:05:02') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-06-10 16:05:44') AS INTEGER) - 978307200) * 1000000000),
  (6, 'FIX-1-0006', 'Yum, can''t wait!', 1, 0, 0, 0, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-06-10 16:06:00') AS INTEGER) - 978307200) * 1000000000, 0, 0);

-- chat 2 · Sam Chen
INSERT INTO message (ROWID, guid, text, handle_id, is_from_me, is_sent, is_delivered, is_read, cache_has_attachments, service, type, item_type, date, date_delivered, date_read) VALUES
  (7, 'FIX-2-0001', 'Did you get the files I sent?', 2, 0, 0, 0, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-05-20 14:00:00') AS INTEGER) - 978307200) * 1000000000, 0, 0),
  (8, 'FIX-2-0002', 'Got them, thanks! Reviewing now.', 0, 1, 1, 1, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-05-20 14:05:00') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-05-20 14:05:03') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-05-20 14:06:20') AS INTEGER) - 978307200) * 1000000000),
  (9, 'FIX-2-0003', 'No rush 👍', 2, 0, 0, 0, 0, 0, 'iMessage', 0, 0,
     (CAST(strftime('%s','2024-05-20 14:06:00') AS INTEGER) - 978307200) * 1000000000, 0, 0);

-- chat 3 · raw handle (no display name, no contact) — tests the handle fallback
INSERT INTO message (ROWID, guid, text, handle_id, is_from_me, is_sent, is_delivered, is_read, cache_has_attachments, service, type, item_type, date, date_delivered, date_read) VALUES
  (10, 'FIX-3-0001', 'Hi, is this the plumber?', 0, 1, 1, 1, 0, 0, 'SMS', 0, 0,
     (CAST(strftime('%s','2024-03-01 09:00:00') AS INTEGER) - 978307200) * 1000000000,
     (CAST(strftime('%s','2024-03-01 09:00:05') AS INTEGER) - 978307200) * 1000000000, 0),
  (11, 'FIX-3-0002', 'Yes! How can I help?', 3, 0, 0, 0, 0, 0, 'SMS', 0, 0,
     (CAST(strftime('%s','2024-03-01 09:15:00') AS INTEGER) - 978307200) * 1000000000, 0, 0);

-- One image attachment on chat 1's message 5. The file is not present on disk, so the
-- engine renders it as a "missing" attachment — a real, common case (iCloud eviction).
INSERT INTO attachment (ROWID, guid, filename, uti, mime_type, transfer_name, total_bytes, is_outgoing, original_guid) VALUES
  (1, 'FIX-ATT-0001', '~/Library/Messages/Attachments/fx/00/FIX-ATT-0001/lunch.jpeg',
     'public.jpeg', 'image/jpeg', 'lunch.jpeg', 842130, 1, 'FIX-ATT-0001-ORIG');

INSERT INTO message_attachment_join (message_id, attachment_id) VALUES (5, 1);

-- Link every message to its chat, newest ordering driven by message.date via the join.
INSERT INTO chat_message_join (chat_id, message_id, message_date)
  SELECT
    CASE
      WHEN m.ROWID BETWEEN 1 AND 6 THEN 1
      WHEN m.ROWID BETWEEN 7 AND 9 THEN 2
      ELSE 3
    END,
    m.ROWID,
    m.date
  FROM message m;
