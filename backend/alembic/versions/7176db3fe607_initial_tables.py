"""initial tables

Revision ID: 7176db3fe607
Revises:
Create Date: 2026-06-11 11:57:31.778430

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7176db3fe607'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('username', sa.String(length=50), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('username')
    )
    op.create_table('games',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('creator_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.String(length=1000), nullable=True),
    sa.Column('is_public', sa.Boolean(), nullable=False),
    sa.Column('invite_code', sa.String(length=20), nullable=True),
    sa.Column('win_hand_size', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('invite_code')
    )
    op.create_table('cards',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('game_id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('image_url', sa.String(length=500), nullable=True),
    sa.Column('card_type', sa.String(length=20), nullable=False),
    sa.Column('has_minigame', sa.Boolean(), nullable=False),
    sa.Column('trigger_condition', sa.String(length=300), nullable=True),
    sa.Column('counter_condition', sa.String(length=300), nullable=True),
    sa.Column('counters_action', sa.Boolean(), nullable=False),
    sa.Column('counters_trap', sa.Boolean(), nullable=False),
    sa.Column('effect_text', sa.String(length=300), nullable=True),
    sa.Column('effect_type', sa.String(length=20), nullable=False),
    sa.Column('effect_value', sa.Integer(), nullable=False),
    sa.Column('effect_target', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('battles',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('game_id', sa.Uuid(), nullable=False),
    sa.Column('player_a_id', sa.Uuid(), nullable=False),
    sa.Column('player_b_id', sa.Uuid(), nullable=True),
    sa.Column('status', sa.Enum('waiting', 'playing', 'done', name='battlestatus'), nullable=False),
    sa.Column('winner_id', sa.Uuid(), nullable=True),
    sa.Column('started_at', sa.DateTime(), nullable=True),
    sa.Column('ended_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['game_id'], ['games.id'], ),
    sa.ForeignKeyConstraint(['player_a_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['player_b_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['winner_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('battles')
    op.drop_table('cards')
    op.drop_table('games')
    op.drop_table('users')
