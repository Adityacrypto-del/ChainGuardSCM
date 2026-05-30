app_name = "blockchain_scm"
app_title = "ChainGuard Supply Chain"
app_publisher = "Aditya Arasamangalam"
app_description = "Blockchain supply chain with malicious node detection"
app_email = "aditya050605@gmail.com"
app_license = "mit"

# Hook into ERPNext supply chain document events
doc_events = {
    "Delivery Note": {
        "on_submit": "blockchain_scm.blockchain.record_delivery_on_chain"
    },
    "Purchase Order": {
        "on_submit": "blockchain_scm.blockchain.record_purchase_on_chain"
    },
    "Stock Entry": {
        "on_submit": "blockchain_scm.blockchain.record_stock_movement"
    },
    "Purchase Receipt": {
        "on_submit": "blockchain_scm.blockchain.record_receipt_on_chain"
    }
}

# Scheduled task — update node reputations every hour
scheduler_events = {
    "hourly": [
        "blockchain_scm.reputation.update_all_reputations"
    ]
}