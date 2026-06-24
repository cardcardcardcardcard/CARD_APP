"""n player battles

Revision ID: 0920025494fd
Revises: 7176db3fe607
Create Date: 2026-06-24 19:49:33.216404

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0920025494fd'
down_revision: Union[str, Sequence[str], None] = '7176db3fe607'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'battle_players',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('battle_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('seat_index', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['battle_id'], ['battles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('battle_id', 'user_id', name='uq_battle_players_battle_user'),
        sa.UniqueConstraint('battle_id', 'seat_index', name='uq_battle_players_battle_seat'),
    )

    # 기존 2인 배틀 데이터를 새 테이블로 이전 (player_a -> seat 0, player_b -> seat 1)
    op.execute("""
        INSERT INTO battle_players (id, battle_id, user_id, seat_index, joined_at)
        SELECT gen_random_uuid(), id, player_a_id, 0, created_at
        FROM battles WHERE player_a_id IS NOT NULL
    """)
    op.execute("""
        INSERT INTO battle_players (id, battle_id, user_id, seat_index, joined_at)
        SELECT gen_random_uuid(), id, player_b_id, 1, created_at
        FROM battles WHERE player_b_id IS NOT NULL
    """)

    op.drop_column('battles', 'player_a_id')
    op.drop_column('battles', 'player_b_id')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('battles', sa.Column('player_b_id', sa.Uuid(), nullable=True))
    op.add_column('battles', sa.Column('player_a_id', sa.Uuid(), nullable=True))
    op.execute("""
        UPDATE battles SET player_a_id = bp.user_id
        FROM battle_players bp WHERE bp.battle_id = battles.id AND bp.seat_index = 0
    """)
    op.execute("""
        UPDATE battles SET player_b_id = bp.user_id
        FROM battle_players bp WHERE bp.battle_id = battles.id AND bp.seat_index = 1
    """)
    op.drop_table('battle_players')
