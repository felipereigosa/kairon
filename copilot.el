(require 'json)
(require 'jsonrpc)

(defvar connection nil)

(defun start-agent ()
  (setq connection
        (make-instance 'jsonrpc-process-connection
                       :process (make-process :name "my agent"
                                              :command (list "node" "./dist/agent.js")
                                              :coding 'utf-8-emacs-unix
                                              :connection-type 'pipe
                                              :noquery t
					      )))

  (jsonrpc-request connection 'initialize '(:capabilities (:workspace (:workspaceFolders t)))))

(defun sync-doc (code)
  (jsonrpc-notify connection ':textDocument/didOpen
                   (list :textDocument (list :uri "./src/index.js"
                                             :languageId "javascript"
                                             :version 0
                                             :text code))))
(defun generate-doc ()
  (list :version 0
        :tabSize 4
        :indentSize 4
        :insertSpaces t
        :path "./src/index.js"
        :uri "./src/index.js"
        :relativePath "src/index.js"
        :languageId "javascript"
        :position (list :line 100 :character 0)))

(defun plist-to-alist (plist)
  (let ((alist '()))
    (while plist
      (let* ((key (substring (symbol-name (car plist)) 1))
             (value (cadr plist)))
        (push (cons key value) alist))
      (setq plist (cddr plist)))
    alist))

(defun complete ()
  (interactive)

  (let ((code (with-temp-buffer
                (insert-file-contents "/tmp/code.txt")
                (buffer-string))))
    (if (not connection)
        (start-agent))

    (sync-doc code)

    (let* ((completions (jsonrpc-request connection
                                         'getCompletions (list :doc (generate-doc))))
           (alist (plist-to-alist completions))
           (json (json-encode-alist alist)))
      (princ (format "%s\n" json)))))
