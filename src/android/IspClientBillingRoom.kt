package com.dipbhola.network.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * Room Entity for ISP Client Billing Records
 * Represents customer internet connection, monthly dues, and payment status.
 */
@Entity(tableName = "isp_client_billing")
data class IspClientBillingEntity(
    @PrimaryKey
    val id: String,
    val customerName: String,
    val clientCode: String, // Connection ID, e.g. DBN-C101
    val phone: String,
    val address: String,
    val packageSpeed: String, // e.g. "10 Mbps"
    val monthlyBill: Double,
    val monthlyDue: Double, // Outstanding amount
    val paidAmount: Double,
    val paymentStatus: String, // "paid", "unpaid", "partial"
    val billingCycleDay: Int = 1,
    val lastPaymentDate: String? = null,
    val lastPaymentAmount: Double? = null,
    val lastPaymentMethod: String? = null,
    val collectedBy: String? = null,
    val notes: String? = null,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Data Access Object (DAO) interface for ISP Client Billing
 */
@Dao
interface ClientBillingDao {

    @Query("SELECT * FROM isp_client_billing ORDER BY customerName ASC")
    fun getAllClients(): Flow<List<IspClientBillingEntity>>

    @Query("SELECT * FROM isp_client_billing WHERE id = :clientId LIMIT 1")
    suspend fun getClientById(clientId: String): IspClientBillingEntity?

    @Query("SELECT * FROM isp_client_billing WHERE paymentStatus = :status ORDER BY monthlyDue DESC")
    fun getClientsByStatus(status: String): Flow<List<IspClientBillingEntity>>

    @Query("SELECT * FROM isp_client_billing WHERE customerName LIKE '%' || :query || '%' OR clientCode LIKE '%' || :query || '%' OR phone LIKE '%' || :query || '%'")
    fun searchClients(query: String): Flow<List<IspClientBillingEntity>>

    @Query("SELECT SUM(monthlyDue) FROM isp_client_billing WHERE isActive = 1")
    fun getTotalOutstandingDues(): Flow<Double?>

    @Query("SELECT SUM(paidAmount) FROM isp_client_billing WHERE isActive = 1")
    fun getTotalCollectedAmount(): Flow<Double?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClient(client: IspClientBillingEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllClients(clients: List<IspClientBillingEntity>)

    @Update
    suspend fun updateClient(client: IspClientBillingEntity)

    @Query("UPDATE isp_client_billing SET monthlyDue = :newDue, paidAmount = paidAmount + :paymentAmount, paymentStatus = :newStatus, lastPaymentDate = :paymentDate, lastPaymentAmount = :paymentAmount, updatedAt = :updatedAt WHERE id = :clientId")
    suspend fun recordPayment(
        clientId: String,
        paymentAmount: Double,
        newDue: Double,
        newStatus: String,
        paymentDate: String,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Delete
    suspend fun deleteClient(client: IspClientBillingEntity)

    @Query("DELETE FROM isp_client_billing WHERE id = :clientId")
    suspend fun deleteClientById(clientId: String)

    @Query("DELETE FROM isp_client_billing")
    suspend fun clearAll()
}

/**
 * App Room Database
 */
@Database(entities = [IspClientBillingEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun clientBillingDao(): ClientBillingDao
}
